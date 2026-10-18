// HeyYumi REST client: caching + 429 backoff + sandbox switch.
const BASE = "https://api.heyyumi.ai/api/v1";
const TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { at: number; body: unknown }>();

export const sandbox = process.env.HEYYUMI_SANDBOX !== "0";

function headers(json = false): Record<string, string> {
  const key = process.env.HEYYUMI_API_KEY;
  if (!key) throw new YumiError(500, "HEYYUMI_API_KEY가 설정되지 않았어요 (로컬: .env.local, Vercel: Environment Variables)");
  const h: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (json) h["Content-Type"] = "application/json";
  if (sandbox) h["X-Map3-Sandbox"] = "1";
  return h;
}

export class YumiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function call(path: string, init: RequestInit, retry = true): Promise<any> {
  const res = await fetch(BASE + path, init);
  if (res.status === 429 && retry) {
    const wait = Math.min(Number(res.headers.get("retry-after") ?? "3"), 10);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return call(path, init, false);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new YumiError(res.status, body?.error?.message ?? body?.error ?? body?.code ?? `HTTP ${res.status}`, body);
  }
  return body;
}

export async function get(path: string, params: Record<string, string | number | undefined> = {}, useCache = true) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const url = `${path}?${qs}`;
  const hit = cache.get(url);
  if (useCache && hit && Date.now() - hit.at < TTL_MS) return hit.body;
  const body = await call(url, { headers: headers() });
  if (useCache) cache.set(url, { at: Date.now(), body });
  return body;
}

export async function post(path: string, payload: unknown) {
  return call(path, { method: "POST", headers: headers(true), body: JSON.stringify(payload) });
}

export type Place = {
  id: string;
  name: string;
  categoryLabel?: string;
  location: { lat: number; lng: number };
  address?: { road?: string };
  distanceM?: number;
  yumiReservable?: boolean;
  placeUrl?: string;
  photoCount?: number;
  price?: { avg?: number; min?: number; max?: number } | null;
  menuSummary?: { items?: string[] } | null;
  nearestStation?: { station: string; walkMin: number } | null;
  culturalAssociations?: {
    subject: string;
    headline?: string;
    summary?: string;
    eventDate?: string;
    sourceUrls?: { url: string; publisher?: string; publishedAt?: string }[];
  }[];
  serviceAttributes?: Record<string, unknown>;
  businessHours?: { day: string; open?: string; close?: string; closed?: boolean }[];
  aiSummary?: string;
};

// Fan demand now lives in the file-backed store.
export { recordDemand, demandFor, demandReport } from "./db";
