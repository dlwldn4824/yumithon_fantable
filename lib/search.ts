// Shared HeyYumi search used by the Explore tab and the Buddy agent.
import { get, post, demandFor, sandbox, type Place } from "@/lib/yumi";
import { localize, type ParsedQuery } from "@/lib/claude";
import { ogImage } from "@/lib/og";

const SHOWS = new Set(["흑백요리사"]);

const LIST_FIELDS = "quality,contact_hours,culturalAssociations,nearestStation";
const MAX_SPOTS = 6;

async function bookableNear(p: Place): Promise<Place[]> {
  const res = await get("/places/nearby", {
    lat: p.location.lat,
    lng: p.location.lng,
    radius: 2000,
    reservation_channel: "yumi",
    sort: "distance",
    page_size: 5,
    fields: LIST_FIELDS,
  });
  return (res.data as Place[]).filter((x) => x.yumiReservable && x.id !== p.id).slice(0, 2);
}

// Run async jobs two at a time so we stay under the HeyYumi rate limit.
export async function pooled<T, R>(items: T[], fn: (t: T) => Promise<R>, size = 2): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export async function runSearch(parsed: ParsedQuery) {
    let spots: Place[] = [];
    let available: string[] = [];
    let mode: "celebrity" | "area" | "none" = "none";
    let total = 0;
    let bookableAll = 0;

    if (parsed.celebrity) {
      mode = "celebrity";
      const res = await get("/places", {
        associated_with: parsed.celebrity,
        keyword: parsed.keyword ?? undefined,
        page_size: 20,
        fields: LIST_FIELDS,
      });
      spots = res.data as Place[];
      total = res.meta?.total ?? spots.length;
      bookableAll = spots.filter((p) => p.yumiReservable).length;
      available = (res.meta?.associatedWith?.available ?? []).map((a: any) => a.subject ?? a).slice(0, 12);
    } else if (parsed.area) {
      mode = "area";
      const reg = await get("/regions", { dong: parsed.area });
      const c = reg.data?.[0]?.center;
      if (c) {
        const res = await get("/places/nearby", {
          lat: c.lat,
          lng: c.lng,
          radius: 1000,
          keyword: parsed.keyword ?? undefined,
          reservation_channel: "yumi",
          sort: "discovery",
          page_size: 10,
          fields: LIST_FIELDS,
        });
        spots = res.data as Place[];
        total = res.meta?.total ?? spots.length;
        bookableAll = spots.filter((p) => p.yumiReservable).length;
      }
    }

    spots = spots.slice(0, MAX_SPOTS);
    const alternatives = await pooled(spots, (p) => (p.yumiReservable ? Promise.resolve([]) : bookableNear(p)));

    // Localize the Korean story lines for the fan in one batch.
    const star = parsed.celebrity ?? "";
    const pick = (p: Place) => {
      const list = p.culturalAssociations ?? [];
      return (
        list.find((c) => c.subject === star) ??
        list.find((c) => `${c.headline ?? ""}${c.summary ?? ""}`.includes(star)) ??
        list.find((c) => c.subject === "BTS") ??
        list[0]
      );
    };
    const assoc = spots.map(pick);
    // Real photos: the cited article's preview image for famous spots,
    // and the owner's main photo for Yumi partners that uploaded one.
    const spotImages = await Promise.all(assoc.map((a) => {
      // NEWS_IMAGES=0 turns off article preview photos (rights not cleared for production).
      const u = a?.sourceUrls?.[0]?.url;
      return u && process.env.NEWS_IMAGES !== "0" ? ogImage(u) : Promise.resolve(null);
    }));
    const altList = [...new Map(alternatives.flat().map((a) => [a.id, a])).values()];
    const altPhotos = new Map<string, string>();
    await pooled(altList.filter((a) => Number(a.photoCount ?? 0) > 0), async (a) => {
      try {
        const d = await get(`/places/${a.id}`, { fields: "photos" });
        if (d.data?.photos?.main) altPhotos.set(a.id, d.data.photos.main);
      } catch {}
    });
    const lines = spots.map((p, i) => assoc[i]?.headline ?? assoc[i]?.summary ?? p.categoryLabel ?? "");
    const labels = [...new Set([...spots, ...alternatives.flat()].map((p) => p.categoryLabel ?? ""))];
    const localized = await localize([...lines, ...labels], parsed.lang);
    const translated = localized !== null && localized.some((t, i) => t !== [...lines, ...labels][i]);
    const labelMap = Object.fromEntries(labels.map((l, i) => [l, localized[lines.length + i]]));

    return {
      parsed,
      mode,
      sandbox,
      available,
      stats: { spots: total, bookable: bookableAll },
      results: spots.map((p, i) => ({
        place: { ...p, categoryLabel: labelMap[p.categoryLabel ?? ""] ?? p.categoryLabel },
        image: spotImages[i],
        // null = not translated; the client renders a story line in its own UI language.
        story: parsed.lang === "ko" || translated ? localized[i] : null,
        storySubject: assoc[i]?.subject ?? star,
        storyIsShow: SHOWS.has(assoc[i]?.subject ?? star),
        storyDate: assoc[i]?.eventDate ?? null,
        source: (assoc[i]?.sourceUrls ?? [])[0] ?? null,
        fansTried: demandFor(p.id),
        alternatives: alternatives[i].map((a) => ({ ...a, image: altPhotos.get(a.id) ?? null, categoryLabel: labelMap[a.categoryLabel ?? ""] ?? a.categoryLabel })),
      })),
    };
}

export type SearchPayload = Awaited<ReturnType<typeof runSearch>>;

/** Yumi partners (bookable in-app) around a named area, with owner photos when present. */
export async function partnersAround(area: string, keyword?: string | null, max = 4) {
  const reg = await get("/regions", { dong: area });
  const c = reg.data?.[0]?.center;
  if (!c) return { area, places: [] as Place[] };
  const res = await get("/places/nearby", {
    lat: c.lat, lng: c.lng, radius: 1500, keyword: keyword ?? undefined,
    reservation_channel: "yumi", sort: "distance", page_size: 10, fields: LIST_FIELDS,
  });
  const places = (res.data as Place[]).filter((p) => p.yumiReservable).slice(0, max);
  await pooled(places.filter((p) => Number(p.photoCount ?? 0) > 0), async (p) => {
    try {
      const d = await get(`/places/${p.id}`, { fields: "photos" });
      (p as Place & { image?: string }).image = d.data?.photos?.main;
    } catch {}
  });
  return { area, places };
}

export type LiveAnswer = { placeId: string; status: string; note?: string | null; verifiedAt?: string | null };

/** Ask several owners the same right-now question at once and collect their answers. */
export async function askOwnersNow(placeIds: string[], party: number): Promise<LiveAnswer[]> {
  return pooled(placeIds, async (placeId) => {
    try {
      const first = await post("/live-status", { placeId, kind: "seats", topic: `${party}명 입장` });
      let s = first.data;
      if (s.blocked) return { placeId, status: "closed_now" };
      for (let i = 0; i < 12 && !s.settled; i++) s = (await get(`/live-status/${s.queryId}`, { wait: 20 }, false)).data;
      return { placeId, status: s.status, note: s.note, verifiedAt: s.verifiedAt };
    } catch (e) {
      const code = JSON.stringify((e as { body?: unknown }).body ?? "");
      return { placeId, status: code.includes("not_available") ? "not_available" : "error" };
    }
  }, 3);
}
