import { NextResponse } from "next/server";
import { z } from "zod";
import { chat } from "@/lib/agent";
import { currentUser } from "@/lib/auth";
import { allow, clientKey, tooMany } from "@/lib/guard";

export const maxDuration = 60;

const Body = z.object({
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).min(1).max(40),
  lang: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
});
const NOW = /지금|바로|now|right away|今すぐ|今|现在|马上/i;

export async function POST(req: Request) {
  const u = await currentUser();
  const key = u?.id ?? clientKey(req);
  if (!allow(`agent:${key}`, 10, 60)) return tooMany();
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  // "Ask owners right now" fans out to several real phones: twice per 5 minutes per person.
  const last = p.data.history[p.data.history.length - 1].text;
  if (NOW.test(last) && !allow(`agent-now:${key}`, 2, 300)) return tooMany();
  return NextResponse.json(await chat(p.data.history.slice(-12), p.data.lang));
}
