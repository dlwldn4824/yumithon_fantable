import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, signup, signupKakao, kakaoPending, login, endSession, deleteAccount, AuthError } from "@/lib/auth";
import { allow, clientKey, tooMany } from "@/lib/guard";

export async function GET() {
  const u = await currentUser();
  const pending = u ? null : await kakaoPending();
  return NextResponse.json({
    user: u && { email: u.email.endsWith(".invalid") ? "Kakao" : u.email, nickname: u.nickname, role: u.role, placeId: u.place_id },
    kakaoPending: pending && { nickname: pending.nickname },
  });
}

const Signup = z.object({
  email: z.string().email().max(120), password: z.string().min(8).max(100), nickname: z.string().trim().min(1).max(24),
  ageOk: z.boolean(), consent: z.boolean(), ownerCode: z.string().max(40).optional(), placeId: z.string().max(20).optional(),
});
const Login = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === "logout") { await endSession(); return NextResponse.json({ ok: true }); }
    if (b.action === "delete") {
      const u = await currentUser();
      if (u) { await deleteAccount(u.id); await endSession(); }
      return NextResponse.json({ ok: true });
    }
    // Brute-force guard: 10 sign-in/sign-up attempts per 10 minutes per client.
    if (!allow(`auth:${clientKey(req)}`, 10, 600)) return tooMany();
    if (b.action === "signup") {
      const p = Signup.safeParse(b);
      if (!p.success) return NextResponse.json({ error: "invalid_input", fields: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
      await signup(p.data);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "kakao_finish") {
      const p = z.object({ nickname: z.string().trim().min(1).max(24), ageOk: z.boolean(), consent: z.boolean() }).safeParse(b);
      if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      await signupKakao(p.data);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "login") {
      const p = Login.safeParse(b);
      if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      await login(p.data.email, p.data.password);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.status });
    throw e;
  }
}
