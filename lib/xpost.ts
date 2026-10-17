// Read a public X post the fan pasted (X's official oEmbed, no login, no scraping),
// then pull out the venue line and dates of a fan event such as a birthday cafe.
import { get, type Place } from "@/lib/yumi";

export type XPost = { url: string; author: string; text: string; venue: string | null; dates: string[] };

const decode = (s: string) =>
  s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&mdash;/g, "—");

export const X_URL = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/i;

export async function readXPost(url: string): Promise<XPost | null> {
  try {
    const res = await fetch(`https://publish.x.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const para = String(j.html ?? "").match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
    const text = decode(para).trim();
    return { url, author: j.author_name ?? "", text, venue: findVenue(text), dates: findDates(text) };
  } catch {
    return null;
  }
}

function findVenue(text: string): string | null {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const marked = lines.find((l) => /📍|장소|place|venue|at\s*[:：]|場所|地点/i.test(l));
  const raw = marked ?? lines.find((l) => /카페|cafe|café|カフェ|咖啡/i.test(l));
  if (!raw) return null;
  return raw.replace(/.*?(📍|장소\s*[:：]?|place\s*[:：]?|venue\s*[:：]?|at\s*[:：]|場所\s*[:：]?|地点\s*[:：]?)/i, "")
    .replace(/#\S+/g, "").replace(/https?:\/\/\S+/g, "").trim().slice(0, 40) || null;
}

function findDates(text: string): string[] {
  return [...new Set(text.match(/\d{1,2}\s*[./월]\s*\d{1,2}\s*일?/g) ?? [])].slice(0, 3);
}

/** Find the venue named in the post on HeyYumi, trying the full line then its first words. */
export async function matchVenue(venue: string): Promise<Place | null> {
  const tries = [venue, venue.split(/\s+/).slice(0, 2).join(" "), venue.split(/\s+/)[0]].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const kw of tries) {
    try {
      const res = await get("/places", { keyword: kw, page_size: 3, fields: "quality,contact_hours" });
      const hit = (res.data as (Place & { matchReason?: string })[]).find((p) => p.matchReason === "name") ?? null;
      if (hit && !res.meta?.keywordFuzzy) return hit;
    } catch {}
  }
  return null;
}
