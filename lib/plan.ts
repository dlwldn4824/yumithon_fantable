// Event-day search shared by the route tab, Buddy and meal parties: places near a venue that are
// OPEN at a given time, bookable Yumi partners first, then walk-ins within walking distance.
import { get, type Place } from "./yumi";
import { ANCHORS } from "./anchors";
import { pooled } from "./search";

const LIST_FIELDS = "quality,contact_hours,edge,nearestStation";

type Raw = Place & { image?: string | null; menu?: { name: string; price?: string | null }[]; recommendedFor?: string[] };
export type Filters = { foreigner: boolean; pay: string[]; halal: boolean; vegan: boolean; group: boolean };
export const NO_FILTERS: Filters = { foreigner: false, pay: [], halal: false, vegan: false, group: false };

export async function resolveAnchor(key?: string | null) {
  const a = ANCHORS.find((x) => x.key === key);
  if (!a) return null;
  if (a.lat != null) return { lat: a.lat, lng: a.lng!, anchor: a };
  const reg = await get("/regions", { dong: a.region! });
  const c = reg.data?.[0]?.center;
  return c ? { lat: c.lat as number, lng: c.lng as number, anchor: a } : null;
}

const slim = (x: Raw) => ({
  id: x.id, name: x.name, categoryLabel: x.categoryLabel, location: x.location, address: x.address,
  distanceM: x.distanceM, yumiReservable: !!x.yumiReservable, image: x.image ?? null, photoCount: x.photoCount,
  nearestStation: x.nearestStation, price: x.price, recommendedFor: x.recommendedFor,
  menu: (x.menu ?? []).slice(0, 12).map((m) => ({ name: m.name, price: m.price })),
  attrs: {
    group: !!x.serviceAttributes?.group_friendly, pay: (x.serviceAttributes?.payment_methods as string[]) ?? [],
    langs: (x.serviceAttributes?.foreign_languages as string[]) ?? [], halal: !!x.serviceAttributes?.muslim_friendly,
  },
});
export type PlannedPlace = ReturnType<typeof slim>;

export async function planAround(o: { lat: number; lng: number; date: string; time: string; filters?: Filters; wide?: boolean; walk?: boolean }) {
  const f = o.filters ?? NO_FILTERS;
  const base = {
    lat: o.lat, lng: o.lng, sort: "distance", fields: LIST_FIELDS, open_at: `${o.date}T${o.time}`,
    foreigner_friendly: f.foreigner ? "true" : undefined,
    payment_methods: f.pay.length ? f.pay.join(",") : undefined,
    muslim_friendly: f.halal ? "true" : undefined,
    dietary: f.vegan ? "vegan_options" : undefined,
    recommended_for: f.group ? "group_dining" : undefined,
  };
  // Bookable partners within a taxi ride (or a walk for neighborhoods), and anything open within walking distance.
  const [bk, walk] = await Promise.all([
    get("/places/nearby", { ...base, radius: o.wide === false ? 1500 : 5000, page_size: 6, reservation_channel: "yumi" }),
    o.walk === false ? Promise.resolve({ data: [] }) : get("/places/nearby", { ...base, radius: 1000, page_size: 8 }),
  ]);
  // HeyYumi widens to non-partner venues when no partner matches; those are not bookable in-app.
  const bookable = (bk.meta?.reservationFallback ? [] : bk.data) as Raw[];
  const ids = new Set(bookable.map((x) => x.id));
  const walkIn = (walk.data as Raw[]).filter((x) => !ids.has(x.id)).slice(0, 6);
  await pooled([...bookable, ...walkIn].filter((x) => Number(x.photoCount ?? 0) > 0), async (x) => {
    try { x.image = (await get(`/places/${x.id}`, { fields: "photos" })).data?.photos?.main ?? null; } catch {}
  });
  return { at: (bk.meta?.openAt?.at as string) ?? null, bookable: bookable.map(slim), walkIn: walkIn.map(slim) };
}

/** Current date and time in Seoul, rounded up to the next half hour. */
export function seoulNow() {
  const d = new Date(Date.now() + 9 * 3600000);
  let h = d.getUTCHours(), m = d.getUTCMinutes() <= 30 ? 30 : 0;
  if (m === 0) h += 1;
  if (h >= 24) h = 23, m = 30;
  return { date: d.toISOString().slice(0, 10), time: `${String(h).padStart(2, "0")}:${m ? "30" : "00"}` };
}
