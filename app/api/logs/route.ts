import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { addLog, likeLog, listLogs } from "@/lib/db";
import { allow, blockedReason, needLogin, tooMany } from "@/lib/guard";

export async function GET() {
  const u = await currentUser();
  return NextResponse.json({ logs: await listLogs(u?.id) });
}

const New = z.object({
  place: z.string().trim().min(1).max(80), placeId: z.string().max(20).nullish(), image: z.string().url().max(500).nullish(),
  note: z.string().trim().max(140).default(""), subject: z.string().max(30).nullish(), lang: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
});

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return needLogin();
  const b = await req.json().catch(() => ({}));
  if (b.like) {
    if (!allow(`like:${u.id}`, 60, 60)) return tooMany();
    return NextResponse.json({ likes: await likeLog(String(b.like), u.id) });
  }
  if (!allow(`log:${u.id}`, 5, 600)) return tooMany();
  const p = New.safeParse(b);
  if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const why = blockedReason(p.data.note);
  if (why) return NextResponse.json({ error: "blocked_content", reason: why }, { status: 422 });
  const id = await addLog(u.id, { ...p.data, nickname: u.nickname });
  return NextResponse.json({ entry: { id } });
}
