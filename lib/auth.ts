// Accounts and sessions: scrypt-hashed passwords, an HMAC-signed HttpOnly session cookie.
// Kakao Login sits on the same users table (kakao_id); those accounts have no password.
import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { q, now, uid } from "./sql";

const COOKIE = "ft_session";
const SESSION_DAYS = 14;

export type User = { id: string; email: string; nickname: string; role: "fan" | "owner"; place_id: string | null; age_ok: number };

/** Signing secret: SESSION_SECRET if set (required on Vercel), else one generated once and kept in .data/. */
function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL) throw new Error("SESSION_SECRET is not set");
  const file = path.join(process.cwd(), ".data", "session-secret");
  try { return fs.readFileSync(file, "utf8"); } catch {}
  const s = randomBytes(32).toString("hex");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, s, { mode: 0o600 });
  return s;
}

export const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");
const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function hash(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
function verify(pw: string, stored: string) {
  if (!stored.includes(":")) return false; // social-login account, no password
  const [salt, h] = stored.split(":");
  return safeEq(scryptSync(pw, salt, 64).toString("hex"), h);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, mac] = raw.split(".");
  if (!id || !exp || !mac || !safeEq(sign(`${id}.${exp}`), mac) || Number(exp) < Date.now()) return null;
  return (await q.get<User>("select id, email, nickname, role, place_id, age_ok from users where id = ?", id)) ?? null;
}

export async function startSession(id: string) {
  const exp = String(Date.now() + SESSION_DAYS * 86400000);
  (await cookies()).set(COOKIE, `${id}.${exp}.${sign(`${id}.${exp}`)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export class AuthError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

export async function signup(input: { email: string; password: string; nickname: string; ageOk: boolean; consent: boolean; ownerCode?: string; placeId?: string }) {
  if (!input.consent) throw new AuthError("consent_required");
  if (!input.ageOk) throw new AuthError("age_required");
  const email = input.email.trim().toLowerCase();
  if (await q.get("select 1 x from users where email = ?", email)) throw new AuthError("email_taken", 409);
  let role: "fan" | "owner" = "fan";
  let placeId: string | null = null;
  if (input.ownerCode) {
    // Owner accounts need an invite code issued per store (stands in for business verification).
    const codes = (process.env.OWNER_INVITES ?? "").split(",").map((c) => c.trim()).filter(Boolean);
    const hit = codes.map((c) => c.split(":")).find(([code]) => code === input.ownerCode);
    if (!hit) throw new AuthError("bad_owner_code", 403);
    role = "owner";
    placeId = hit[1] ?? input.placeId ?? null;
  }
  const id = uid();
  await q.run("insert into users (id, email, nickname, pw_hash, role, place_id, age_ok, consent_at, created_at) values (?,?,?,?,?,?,?,?,?)",
    id, email, input.nickname.trim(), hash(input.password), role, placeId, 1, now(), now());
  await startSession(id);
  return id;
}

export async function login(email: string, password: string) {
  const row = await q.get<{ id: string; pw_hash: string }>("select id, pw_hash from users where email = ?", email.trim().toLowerCase());
  if (!row || !verify(password, row.pw_hash)) throw new AuthError("bad_credentials", 401);
  await startSession(row.id);
  return row.id;
}

/** Delete the account and everything tied to it (logs, likes, trades, offers, presence, reports, blocks). */
export async function deleteAccount(id: string) {
  for (const sql of [
    "delete from log_likes where user_id = ?", "delete from logs where user_id = ?", "delete from offers where user_id = ?",
    "delete from trades where user_id = ?", "delete from presence where user_id = ?", "delete from reports where user_id = ?",
    "delete from blocks where user_id = ? or blocked_id = ?", "delete from demand where user_key = ?", "delete from users where id = ?",
  ]) await q.run(sql, ...(sql.includes(" or ") ? [id, id] : [id]));
}

// ---------- Kakao Login ----------
const PENDING = "ft_kakao";
export type KakaoProfile = { id: string; nickname: string; email: string | null };

export const kakaoUserId = async (kakaoId: string) =>
  (await q.get<{ id: string }>("select id from users where kakao_id = ?", kakaoId))?.id ?? null;

/** A first-time Kakao user still has to confirm age and terms; their profile waits in a signed 10-minute cookie. */
export async function setKakaoPending(p: KakaoProfile) {
  const body = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + 600000 })).toString("base64url");
  (await cookies()).set(PENDING, `${body}.${sign(body)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
}
export async function kakaoPending(): Promise<KakaoProfile | null> {
  const raw = (await cookies()).get(PENDING)?.value;
  if (!raw) return null;
  const [body, mac] = raw.split(".");
  if (!body || !mac || !safeEq(sign(body), mac)) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString()) as KakaoProfile & { exp: number };
  return p.exp > Date.now() ? { id: p.id, nickname: p.nickname, email: p.email } : null;
}

export async function signupKakao(input: { nickname: string; ageOk: boolean; consent: boolean }) {
  const p = await kakaoPending();
  if (!p) throw new AuthError("kakao_expired", 401);
  if (!input.consent) throw new AuthError("consent_required");
  if (!input.ageOk) throw new AuthError("age_required");
  const existing = await kakaoUserId(p.id);
  if (existing) { await startSession(existing); return existing; }
  // Kakao may not share an email; a placeholder keeps the column unique without contacting anyone.
  const email = p.email && !(await q.get("select 1 x from users where email = ?", p.email.toLowerCase())) ? p.email.toLowerCase() : `kakao-${p.id}@users.fantable.invalid`;
  const id = uid();
  await q.run("insert into users (id, email, nickname, pw_hash, role, place_id, age_ok, consent_at, created_at, kakao_id) values (?,?,?,?,?,?,?,?,?,?)",
    id, email, input.nickname.trim(), "!kakao", "fan", null, 1, now(), now(), p.id);
  (await cookies()).delete(PENDING);
  await startSession(id);
  return id;
}
