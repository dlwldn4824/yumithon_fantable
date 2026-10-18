import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { report } from "@/lib/db";
import { allow, needLogin, tooMany } from "@/lib/guard";

const Body = z.object({ type: z.enum(["log", "event", "trade"]), id: z.string().max(64), reason: z.string().max(60).default("other") });

// Report content; three distinct reporters hide it until an operator reviews it.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return needLogin();
  if (!allow(`report:${u.id}`, 20, 3600)) return tooMany();
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return NextResponse.json({ ok: await report(p.data.type, p.data.id, u.id, p.data.reason) });
}
