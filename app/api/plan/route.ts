import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { allow, clientKey, tooMany } from "@/lib/guard";
import { planAround, resolveAnchor } from "@/lib/plan";

const Body = z.object({
  anchor: z.string().max(40).optional(),
  lat: z.number().min(33).max(39).optional(), lng: z.number().min(124).max(132).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/),
  party: z.number().int().min(1).max(30).default(2),
  filters: z.object({
    foreigner: z.boolean().default(false), pay: z.array(z.enum(["apple_pay", "alipay", "wechat_pay", "unionpay", "card"])).max(3).default([]),
    halal: z.boolean().default(false), vegan: z.boolean().default(false), group: z.boolean().default(false),
  }).prefault({}),
});

// Event-day route: places near a concert venue or fan area that are OPEN at that time and bookable in-app.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!allow(`plan:${u?.id ?? clientKey(req)}`, 12, 60)) return tooMany();
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const b = p.data;
  const at = b.anchor ? await resolveAnchor(b.anchor) : b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng, anchor: null } : null;
  if (!at) return NextResponse.json({ error: "unknown_anchor" }, { status: 400 });
  // Named venues and neighborhoods search a taxi ride out; a birthday cafe pin searches walking distance.
  const r = await planAround({ lat: at.lat, lng: at.lng, date: b.date, time: b.time, filters: b.filters, wide: !!at.anchor });
  return NextResponse.json({ center: { lat: at.lat, lng: at.lng }, ...r });
}
