import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addEvent, listEvents } from "@/lib/db";
import { readXPost, matchVenue, X_URL } from "@/lib/xpost";
import { detectSubject } from "@/lib/agent";
import { allow, blockedReason, needLogin, tooMany } from "@/lib/guard";

export async function GET() {
  return NextResponse.json({ events: listEvents() });
}

// Register a fan event (e.g. a birthday cafe) from an X post a signed-in fan pasted.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return needLogin();
  if (!allow(`event:${u.id}`, 5, 600)) return tooMany();
  const { url } = await req.json().catch(() => ({}));
  const link = String(url ?? "").match(X_URL)?.[0];
  if (!link) return NextResponse.json({ error: "x_link_required" }, { status: 400 });
  const post = await readXPost(link);
  if (!post) return NextResponse.json({ error: "x_post_unreadable" }, { status: 422 });
  if (blockedReason(post.text) === "abuse") return NextResponse.json({ error: "blocked_content" }, { status: 422 });
  const place = post.venue ? await matchVenue(post.venue) : null;
  const event = addEvent(u.id, {
    idol: detectSubject(post.text), venue: post.venue, dates: post.dates, xUrl: link, author: post.author, text: post.text.slice(0, 500),
    placeId: place?.id ?? null, place: place?.name ?? null, yumiReservable: !!place?.yumiReservable,
    lat: place?.location.lat ?? null, lng: place?.location.lng ?? null, road: place?.address?.road ?? null,
  });
  return NextResponse.json({ event });
}
