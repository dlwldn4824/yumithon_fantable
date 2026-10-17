import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { get, post, YumiError } from "@/lib/yumi";
import { allow, blockedReason, needLogin, tooMany } from "@/lib/guard";
import {
  claimMeetBooking, createMeet, getMeet, joinMeet, leaveMeet, listMeets, meetBookingFailed, meetRequested, report, setMeetStatus, type Meet,
} from "@/lib/db";

const Lang = z.enum(["ko", "en", "ja", "zh"]).catch("ko");
const Place = z.object({
  id: z.string().max(40), name: z.string().max(80), categoryLabel: z.string().max(40).optional(),
  location: z.object({ lat: z.number(), lng: z.number() }), address: z.object({ road: z.string().max(160).optional() }).optional(),
  image: z.string().url().max(600).nullable().optional(), yumiReservable: z.boolean(),
  nearestStation: z.object({ station: z.string(), walkMin: z.number() }).nullable().optional(),
  menu: z.array(z.object({ name: z.string().max(80), price: z.string().max(30).nullable().optional() })).max(12).optional(),
});
const Create = z.object({
  anchor: z.string().max(60), anchorName: z.string().max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/),
  goal: z.number().int().min(2).max(8), place: Place, intro: z.string().trim().min(1).max(100),
  contact: z.object({ name: z.string().trim().min(1).max(40), phone: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/), email: z.string().email().max(120).optional().or(z.literal("")) }),
  consent: z.literal(true),
});

const at = (m: { date: string; time: string }) => `${m.date}T${m.time}:00+09:00`;

// Only nicknames, languages and the host's intro leave the server; the booking contact never does.
const view = (m: Meet, me?: string | null) => ({
  id: m.id, hostNick: m.hostNick, anchor: m.anchor, anchorName: m.anchorName, date: m.date, time: m.time, goal: m.goal,
  place: m.place, intro: m.intro, status: m.status, resError: m.resError,
  isHost: m.hostId === me, joined: m.members.some((x) => x.uid === me),
  members: m.members.map(({ nick, lang }) => ({ nick, lang })),
});

/** Sends the party's reservation to HeyYumi; the owner accepts it in the 유미 사장님 app. */
async function book(m: Meet) {
  const contact = claimMeetBooking(m.id);
  if (!contact) return;
  try {
    const res = await post("/reservations", {
      placeId: m.place.id, reservationTime: at(m), guestCount: m.members.length,
      guestName: contact.name, guestPhone: contact.phone, guestEmail: contact.email || undefined,
      note: `Fan Table 밥팟 · ${m.members.length}명 · ${m.anchorName} 공연·생카 손님 (해외 팬 포함)`, idempotencyKey: `meet-${m.id}`,
    });
    meetRequested(m.id, res.data.reservationId);
  } catch (e) {
    meetBookingFailed(m.id, (e as YumiError).message ?? "error");
  }
}

/** While the owner hasn't answered, check the reservation once per page refresh. */
async function refresh(m: Meet) {
  if (m.status !== "requested" || !m.reservationId) return m;
  try {
    const r = (await get(`/reservations/${m.reservationId}`, {}, false)).data;
    if (r.status === "confirmed") setMeetStatus(m.id, "booked");
    else if (["cancelled", "expired", "no_show"].includes(r.status)) setMeetStatus(m.id, "failed", r.status);
  } catch {}
  return getMeet(m.id) ?? m;
}

export async function GET(req: Request) {
  const u = await currentUser();
  const q = new URL(req.url).searchParams;
  const id = q.get("id");
  if (id) {
    const m = getMeet(id);
    return m ? NextResponse.json({ meet: view(await refresh(m), u?.id), signedIn: !!u }) : NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const anchor = q.get("anchor"), date = q.get("date");
  if (!anchor || !date) return NextResponse.json({ meets: [] });
  return NextResponse.json({ meets: listMeets(anchor, date).map((m) => view(m, u?.id)) });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return needLogin();
  if (!allow(`meet:${u.id}`, 20, 60)) return tooMany();
  const b = await req.json().catch(() => ({}));
  const lang = Lang.parse(b.lang);

  if (b.action === "create") {
    const p = Create.safeParse(b);
    if (!p.success) return NextResponse.json({ error: "invalid_input", fields: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
    if (!p.data.place.yumiReservable) return NextResponse.json({ error: "not_bookable" }, { status: 400 });
    if (new Date(at(p.data)).getTime() < Date.now()) return NextResponse.json({ error: "time_in_past" }, { status: 400 });
    // The intro is public: no contact details, links or money talk.
    const why = blockedReason(p.data.intro, { money: true });
    if (why) return NextResponse.json({ error: "blocked_content", reason: why }, { status: 422 });
    const id = createMeet(u, lang, { ...p.data, contact: { ...p.data.contact, email: p.data.contact.email || undefined } });
    return id ? NextResponse.json({ id }) : NextResponse.json({ error: "too_many_meets" }, { status: 429 });
  }
  const id = String(b.id ?? "");
  if (b.action === "join") {
    const r = joinMeet(id, u, lang);
    if (r !== "ok") return NextResponse.json({ error: r === "full" ? "meet_full" : "meet_closed" }, { status: 409 });
    const m = getMeet(id)!;
    if (m.members.length >= m.goal) await book(m);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "book_now") {
    // The host may book early with whoever has joined so far.
    const m = getMeet(id);
    if (!m || m.hostId !== u.id || m.members.length < 2) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    await book(m);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "leave") { leaveMeet(id, u.id); return NextResponse.json({ ok: true }); }
  if (b.action === "report") return NextResponse.json({ ok: report("meet", id, u.id, String(b.reason ?? "other")) });
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
