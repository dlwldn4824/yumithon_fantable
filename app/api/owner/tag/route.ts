import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { currentTagToken, tagTokenTtlSec } from "@/lib/tagtoken";
import { roomPeople } from "@/lib/db";

// The owner's store tag: a link with a token that rotates every 5 minutes.
export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== "owner" || !u.place_id) return NextResponse.json({ error: "owner_only" }, { status: 403 });
  return NextResponse.json({ placeId: u.place_id, token: currentTagToken(u.place_id), ttl: tagTokenTtlSec(), here: (await roomPeople(u.place_id)).length });
}
