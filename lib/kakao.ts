// Kakao Login (OAuth 2.0, REST API key). The redirect URI must be registered in Kakao Developers
// for every address the app runs on, e.g. http://localhost:3000/api/auth/kakao/callback.

/** Public origin of this request, honoring the tunnel/proxy headers; KAKAO_REDIRECT_BASE overrides it. */
export function originOf(req: Request) {
  if (process.env.KAKAO_REDIRECT_BASE) return process.env.KAKAO_REDIRECT_BASE.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
export const redirectUri = (req: Request) => `${originOf(req)}/api/auth/kakao/callback`;

/** Only same-site paths are followed after sign-in. */
export const safeNext = (n?: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/me");

export async function kakaoProfile(code: string, redirect: string) {
  const form = new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.KAKAO_REST_API_KEY!, redirect_uri: redirect, code });
  if (process.env.KAKAO_CLIENT_SECRET) form.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  const tok = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" }, body: form,
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(tok.error_code ?? tok.error ?? "token_failed");
  const me = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json());
  if (!me.id) throw new Error("profile_failed");
  const acc = me.kakao_account ?? {};
  return {
    id: String(me.id),
    nickname: String(acc.profile?.nickname ?? me.properties?.nickname ?? "Fan").slice(0, 24),
    email: acc.email && acc.is_email_verified !== false ? String(acc.email) : null,
  };
}
