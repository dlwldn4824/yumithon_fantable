import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { joinRoom, roomPeople, isHere, roomTrades, postTrade, offerTrade, acceptOffer, finishTrade, block, report } from "@/lib/db";
import { validTagToken } from "@/lib/tagtoken";
import { get } from "@/lib/yumi";
import { allow, blockedReason, needLogin, tooMany } from "@/lib/guard";

type Ctx = { params: Promise<{ placeId: string }> };
const Item = z.string().trim().min(1).max(60);

// The in-store room: signed-in fans who tapped this venue's tag (valid rotating token) in the last 2 hours.
export async function GET(_req: Request, { params }: Ctx) {
  const { placeId } = await params;
  const u = await currentUser();
  let place: { name?: string; address?: { road?: string } } | null = null;
  try { place = (await get(`/places/${placeId}`, { fields: "core" })).data; } catch {}
  const here = !!u && isHere(placeId, u.id);
  return NextResponse.json({ place, me: u?.id ?? null, signedIn: !!u, here, people: roomPeople(placeId), trades: here && u ? roomTrades(placeId, u.id) : [] });
}

export async function POST(req: Request, { params }: Ctx) {
  const { placeId } = await params;
  const u = await currentUser();
  if (!u) return needLogin();
  if (!allow(`room:${u.id}`, 30, 60)) return tooMany();
  const b = await req.json().catch(() => ({}));

  if (b.action === "join") {
    if (!validTagToken(placeId, b.token)) return NextResponse.json({ error: "tag_expired" }, { status: 403 });
    joinRoom(placeId, u.id, u.nickname, z.enum(["ko", "en", "ja", "zh"]).catch("ko").parse(b.lang));
    return NextResponse.json({ ok: true });
  }
  if (!isHere(placeId, u.id)) return NextResponse.json({ error: "tap_the_tag_first" }, { status: 403 });

  if (b.action === "post") {
    const p = z.object({ have: Item, want: Item, note: z.string().trim().max(80).default("") }).safeParse(b);
    if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    // Trades happen in person in the store: block money talk, contact details and outside links.
    const why = blockedReason(`${p.data.have} ${p.data.want} ${p.data.note}`, { money: true });
    if (why) return NextResponse.json({ error: "blocked_content", reason: why }, { status: 422 });
    const id = postTrade(placeId, u.id, u.nickname, p.data.have, p.data.want, p.data.note);
    return id ? NextResponse.json({ id }) : NextResponse.json({ error: "too_many_open_trades" }, { status: 429 });
  }
  if (b.action === "offer") {
    const give = Item.safeParse(b.give);
    if (!give.success || blockedReason(give.data, { money: true })) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ ok: offerTrade(String(b.tradeId), u.id, u.nickname, give.data) });
  }
  if (b.action === "accept") return NextResponse.json({ ok: acceptOffer(String(b.tradeId), u.id, String(b.offerId)) });
  if (b.action === "done") return NextResponse.json({ ok: finishTrade(String(b.tradeId), u.id) });
  if (b.action === "block") { block(u.id, String(b.target)); return NextResponse.json({ ok: true }); }
  if (b.action === "report") return NextResponse.json({ ok: report("trade", String(b.tradeId), u.id, String(b.reason ?? "other")) });
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
