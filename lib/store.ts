// Per-device state for the fan: bookings and collected stamps (localStorage, best effort).
export type Booking = { id: string; placeId: string; place: string; image?: string | null; date: string; time: string; party: number; at: string };
export type Stamp = { place: string; image?: string | null; at: string };

const read = <T,>(k: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getBookings = () => read<Booking[]>("st-bookings", []);
export function saveBooking(b: Booking) {
  write("st-bookings", [b, ...getBookings().filter((x) => x.id !== b.id)]);
}
// Older builds stored plain names; normalize them to Stamp objects.
export const getStamps = (): Stamp[] =>
  read<(string | Stamp)[]>("st-stamps", []).map((x) => (typeof x === "string" ? { place: x, at: "" } : x));
export function addStamp(place: string, image?: string | null) {
  const s = getStamps();
  if (!s.some((x) => x.place === place)) write("st-stamps", [...s, { place, image, at: new Date().toISOString() }]);
  return getStamps();
}
export const getSubject = () => read<string | null>("st-subject", null);
export const setSubject = (q: string) => write("st-subject", q);

export const getNick = () => read<string>("st-nick", "");
export const setNick = (n: string) => write("st-nick", n);
export const getMyLogs = () => read<string[]>("st-mylogs", []);
export const addMyLog = (id: string) => write("st-mylogs", [id, ...getMyLogs()]);

export type User = { email: string; nickname: string };
export const getUser = () => read<User | null>("st-user", null);
export const setUser = (u: User | null) => write("st-user", u);

/** Anonymous per-device id for the in-store room. */
export function getUid() {
  let id = read<string>("st-uid", "");
  if (!id) { id = crypto.randomUUID(); write("st-uid", id); }
  return id;
}
