import { NextResponse } from "next/server";
import { z } from "zod";
import { get, post, YumiError } from "@/lib/yumi";
import { currentUser } from "@/lib/auth";
import { allow, clientKey, tooMany } from "@/lib/guard";

const Ask = z.object({ placeId: z.string().max(20), kind: z.enum(["item", "wait", "seats"]), topic: z.string().trim().min(1).max(40), question: z.string().max(200).optional() });

// Ask the owner a right-now question. Each one pings a real phone, so it is tightly limited:
// 4 per minute per person, and the same person can ask a given venue once per 2 minutes.
export async function POST(req: Request) {
  const u = await currentUser();
  const key = u?.id ?? clientKey(req);
  const p = Ask.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!allow(`live:${key}`, 4, 60) || !allow(`live:${key}:${p.data.placeId}`, 1, 120)) return tooMany();
  try {
    const res = await post("/live-status", p.data);
    return NextResponse.json(res.data);
  } catch (e) {
    const err = e as YumiError;
    return NextResponse.json({ error: err.message, body: err.body }, { status: err.status ?? 500 });
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[\w-]{6,200}$/.test(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const res = await get(`/live-status/${id}`, { wait: 20 }, false);
    return NextResponse.json(res.data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: (e as YumiError).status ?? 500 });
  }
}
