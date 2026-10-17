import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { originOf, redirectUri, safeNext } from "@/lib/kakao";
import { allow, clientKey } from "@/lib/guard";

// Step 1: send the fan to Kakao's consent screen, with a one-time state to stop forged callbacks.
export async function GET(req: Request) {
  const back = (q: string) => NextResponse.redirect(new URL(`/me?${q}`, originOf(req)));
  if (!process.env.KAKAO_REST_API_KEY) return back("kakao_error=not_configured");
  if (!allow(`kakao:${clientKey(req)}`, 10, 600)) return back("kakao_error=rate_limited");
  const state = randomBytes(16).toString("hex");
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.search = new URLSearchParams({ client_id: process.env.KAKAO_REST_API_KEY, redirect_uri: redirectUri(req), response_type: "code", state }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("ft_kakao_state", `${state}|${next}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
