// Request guards: rate limits (token bucket per key), client keys, and a content filter
// for user-written text (contact details, money-transfer bait, ads, slurs).
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

type Bucket = { tokens: number; at: number };
const g = globalThis as unknown as { __buckets?: Map<string, Bucket> };
const buckets = (g.__buckets ??= new Map());

/** Allow `limit` calls per `windowSec` for this key; returns false when over. */
export function allow(key: string, limit: number, windowSec: number) {
  const t = Date.now();
  const b = buckets.get(key) ?? { tokens: limit, at: t };
  b.tokens = Math.min(limit, b.tokens + ((t - b.at) / 1000) * (limit / windowSec));
  b.at = t;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

/** Hashed client IP, so limits work for signed-out visitors without storing raw IPs. */
export function clientKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return "ip:" + createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export const tooMany = () => NextResponse.json({ error: "rate_limited" }, { status: 429 });
export const needLogin = () => NextResponse.json({ error: "login_required" }, { status: 401 });

const RULES: [RegExp, string][] = [
  [/(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}|\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4})/, "contact"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "contact"],
  [/(계좌|입금|송금|선입금|택배|직거래|가격|원에|만원|paypal|venmo|wire|bank|transfer|西联|汇款|振込|送金)/i, "money"],
  [/(카톡|kakao|open\.?kakao|오픈채팅|텔레그램|telegram|line\s?id|위챗\s?아이디|t\.me\/)/i, "contact"],
  [/(https?:\/\/(?!x\.com|twitter\.com)\S+)/i, "link"],
  [/(시발|씨발|병신|좆|fuck|shit|bitch)/i, "abuse"],
];

/** Returns the reason a text is blocked, or null if it is fine. Money wording is only checked for trades. */
export function blockedReason(text: string, opts: { money?: boolean } = {}): string | null {
  for (const [re, why] of RULES) if ((why !== "money" || opts.money) && re.test(text)) return why;
  return null;
}

export const REPORT_HIDE_AT = 3;
