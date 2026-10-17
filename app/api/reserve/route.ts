import { NextResponse } from "next/server";
import { z } from "zod";
import { get, post, YumiError } from "@/lib/yumi";
import { recordDemand } from "@/lib/db";
import { noteForOwner } from "@/lib/claude";
import { currentUser } from "@/lib/auth";
import { allow, blockedReason, needLogin, tooMany } from "@/lib/guard";

const Book = z.object({
  placeId: z.string().max(20), placeName: z.string().max(80), reservationTime: z.string().datetime({ offset: true }),
  guestCount: z.coerce.number().int().min(1).max(30), guestName: z.string().trim().min(1).max(40),
  guestPhone: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/), guestEmail: z.string().email().max(120).optional().or(z.literal("")),
  note: z.string().max(200).default(""), lang: z.enum(["ko", "en", "ja", "zh"]).default("ko"), consent: z.literal(true),
});

// The phone/email go straight to HeyYumi for this booking and are not stored by this app.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return needLogin();
  if (!allow(`reserve:${u.id}`, 5, 600)) return tooMany();
  const p = Book.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "invalid_input", fields: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const b = p.data;
  if (b.note && blockedReason(b.note) === "abuse") return NextResponse.json({ error: "blocked_content" }, { status: 422 });
  if (new Date(b.reservationTime).getTime() < Date.now()) return NextResponse.json({ error: "time_in_past" }, { status: 400 });
  try {
    const res = await post("/reservations", {
      placeId: b.placeId, reservationTime: b.reservationTime, guestCount: b.guestCount, guestName: b.guestName,
      guestPhone: b.guestPhone, guestEmail: b.guestEmail || undefined,
      note: await noteForOwner(b.note, b.lang, b.guestCount), idempotencyKey: crypto.randomUUID(),
    });
    return NextResponse.json(res.data);
  } catch (e) {
    const err = e as YumiError;
    const notPartner = err.status === 422 && JSON.stringify(err.body ?? "").includes("not_available");
    const fansTried = notPartner ? recordDemand({ id: b.placeId, name: b.placeName }, b.lang, u.id) : undefined;
    return NextResponse.json({ error: err.message, body: err.body, notPartner, fansTried }, { status: err.status ?? 500 });
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[\w-]{6,300}$/.test(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const res = await get(`/reservations/${id}`, { wait: 20 }, false);
    return NextResponse.json(res.data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: (e as YumiError).status ?? 500 });
  }
}
