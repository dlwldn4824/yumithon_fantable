import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kakaoUserId, setKakaoPending, startSession } from "@/lib/auth";
import { kakaoProfile, originOf, redirectUri, safeNext } from "@/lib/kakao";

// Step 2: Kakao sends the fan back with a code. Known fans are signed in; new fans confirm age and terms first.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  const [state, rawNext] = (jar.get("ft_kakao_state")?.value ?? "").split("|");
  jar.delete("ft_kakao_state");
  const next = safeNext(rawNext);
  const go = (path: string) => NextResponse.redirect(new URL(path, originOf(req)));
  if (q.get("error")) return go(`/me?kakao_error=cancelled`);
  if (!state || state !== q.get("state") || !q.get("code")) return go(`/me?kakao_error=state`);
  try {
    const p = await kakaoProfile(q.get("code")!, redirectUri(req));
    const existing = kakaoUserId(p.id);
    if (existing) { await startSession(existing); return go(next); }
    await setKakaoPending(p);
    return go(`/me?kakao=finish&next=${encodeURIComponent(next)}`);
  } catch {
    return go(`/me?kakao_error=failed`);
  }
}
