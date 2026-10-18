// Data access: fan demand, food logs, fan events, the in-store room (presence + photocard trades)
// and meal parties. Reports hide content automatically after REPORT_HIDE_AT.
import { q, num, now, uid, type Row } from "./sql";
import { REPORT_HIDE_AT } from "./guard";

const STAY_MS = 2 * 60 * 60 * 1000;
const since = (ms: number) => new Date(Date.now() - ms).toISOString();

// ---------- unmet fan demand (owner report) ----------
/** Counts each person once per venue (signed-in user id, or hashed IP for visitors). */
export async function recordDemand(p: { id: string; name: string }, lang: string, userKey = "anon") {
  await q.run("insert into demand (place_id, place_name, user_key, lang, at) values (?,?,?,?,?) on conflict do nothing", p.id, p.name, userKey, lang, now());
  return demandFor(p.id);
}
export const demandFor = async (id: string) => num((await q.get("select count(*) c from demand where place_id = ?", id))?.c);

export type Demand = { id: string; name: string; count: number; langs: Record<string, number>; last: string };
export async function demandReport(placeId?: string | null): Promise<Demand[]> {
  const rows = await q.all<{ id: string; name: string; lang: string; n: unknown; last: string }>(
    `select place_id id, max(place_name) "name", lang, count(*) n, max(at) "last" from demand ${placeId ? "where place_id = ?" : ""} group by place_id, lang`,
    ...(placeId ? [placeId] : []),
  );
  const by = new Map<string, Demand>();
  for (const r of rows) {
    const d = by.get(r.id) ?? { id: r.id, name: r.name, count: 0, langs: {}, last: "" };
    d.count += num(r.n);
    d.langs[r.lang] = num(r.n);
    if (r.last > d.last) d.last = r.last;
    by.set(r.id, d);
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

// ---------- food logs ----------
export type LogEntry = {
  id: string; place: string; placeId?: string | null; image?: string | null; note: string; subject?: string | null;
  lang: string; nickname: string; at: string; likes: number; liked: boolean; demo: boolean; mine: boolean;
};
export async function listLogs(viewer?: string | null): Promise<LogEntry[]> {
  const rows = await q.all(
    `select l.*, (select count(*) from log_likes k where k.log_id = l.id) likes,
       (select count(*) from log_likes k where k.log_id = l.id and k.user_id = ?) liked
     from logs l where l.hidden = 0 order by l.at desc limit 200`,
    viewer ?? "",
  );
  return rows.map((r) => ({
    id: r.id as string, place: r.place as string, placeId: r.place_id as string | null, image: r.image as string | null,
    note: r.note as string, subject: r.subject as string | null, lang: r.lang as string, nickname: r.nickname as string,
    at: r.at as string, likes: num(r.likes), liked: num(r.liked) > 0, demo: !!num(r.demo), mine: !!viewer && r.user_id === viewer,
  }));
}
export async function addLog(userId: string, e: { place: string; placeId?: string | null; image?: string | null; note: string; subject?: string | null; lang: string; nickname: string }) {
  const id = uid();
  await q.run("insert into logs (id, user_id, place, place_id, image, note, subject, lang, nickname, at) values (?,?,?,?,?,?,?,?,?,?)",
    id, userId, e.place, e.placeId ?? null, e.image ?? null, e.note, e.subject ?? null, e.lang, e.nickname, now());
  return id;
}
export async function likeLog(id: string, userId: string) {
  await q.run("insert into log_likes (log_id, user_id) values (?,?) on conflict do nothing", id, userId);
  return num((await q.get("select count(*) c from log_likes where log_id = ?", id))?.c);
}

// ---------- reports (any content) ----------
const TABLE: Record<string, string> = { log: "logs", event: "events", trade: "trades", meet: "meets" };
export async function report(type: string, id: string, userId: string, reason: string) {
  const table = TABLE[type];
  if (!table) return false;
  await q.run("insert into reports (target_type, target_id, user_id, reason, at) values (?,?,?,?,?) on conflict do nothing", type, id, userId, reason.slice(0, 60), now());
  const n = num((await q.get("select count(*) c from reports where target_type = ? and target_id = ?", type, id))?.c);
  if (n >= REPORT_HIDE_AT) await q.run(`update ${table} set hidden = 1 where id = ?`, id);
  return true;
}

// ---------- fan events (birthday cafes) ----------
export type FanEvent = {
  id: string; kind: "event" | "venue"; idol: string | null; venue: string | null; placeId: string | null; place: string | null;
  yumiReservable: boolean; lat: number | null; lng: number | null; road: string | null; dates: string[]; xUrl: string; author: string; text: string; at: string;
};
const toEvent = (r: Row): FanEvent => ({
  id: r.id as string, kind: (r.kind as "event" | "venue") ?? "event", idol: r.idol as string | null, venue: r.venue as string | null,
  placeId: r.place_id as string | null, place: r.place as string | null, yumiReservable: !!num(r.yumi_reservable),
  lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng), road: r.road as string | null, dates: JSON.parse((r.dates as string) || "[]"),
  xUrl: r.x_url as string, author: r.author as string, text: r.text as string, at: r.at as string,
});
export const listEvents = async () =>
  (await q.all("select * from events where hidden = 0 order by kind asc, at desc")).map(toEvent);
export async function addEvent(userId: string, e: Omit<FanEvent, "id" | "at" | "kind"> & { kind?: "event" | "venue" }) {
  const dup = await q.get("select * from events where x_url = ?", e.xUrl);
  if (dup) return toEvent(dup);
  const id = uid();
  await q.run(`insert into events (id, kind, idol, venue, place_id, place, yumi_reservable, lat, lng, road, dates, x_url, author, text, created_by, at)
    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, e.kind ?? "event", e.idol, e.venue, e.placeId, e.place, e.yumiReservable ? 1 : 0,
    e.lat, e.lng, e.road, JSON.stringify(e.dates), e.xUrl, e.author, e.text, userId, now());
  return toEvent((await q.get("select * from events where id = ?", id))!);
}

// ---------- in-store room ----------
async function purgeRoom() {
  await q.run("delete from presence where at < ?", since(STAY_MS));
  await q.run("delete from offers where trade_id in (select id from trades where at < ?)", since(24 * 3600000));
  await q.run("delete from trades where at < ?", since(24 * 3600000));
}
export async function joinRoom(placeId: string, userId: string, nick: string, lang: string) {
  await purgeRoom();
  await q.run(`insert into presence (place_id, user_id, nick, lang, at) values (?,?,?,?,?)
    on conflict (place_id, user_id) do update set nick = excluded.nick, lang = excluded.lang, at = excluded.at`, placeId, userId, nick, lang, now());
}
export const roomPeople = (placeId: string) =>
  q.all<{ nick: string; lang: string }>("select nick, lang from presence where place_id = ? and at > ?", placeId, since(STAY_MS));
export const isHere = async (placeId: string, userId: string) =>
  !!(await q.get("select 1 x from presence where place_id = ? and user_id = ? and at > ?", placeId, userId, since(STAY_MS)));

export type Offer = { id: string; uid: string; nick: string; give: string };
export type Trade = {
  id: string; uid: string; nick: string; have: string; want: string; note: string; at: string; offers: Offer[];
  accepted: { offerId: string; code: string } | null; doneOwner: boolean; donePartner: boolean;
};
/** Open trades in this store, minus hidden ones and anyone the viewer blocked (or who blocked them). */
export async function roomTrades(placeId: string, viewer: string): Promise<Trade[]> {
  const blocked = new Set(
    (await q.all<{ b: string }>("select blocked_id b from blocks where user_id = ? union select user_id b from blocks where blocked_id = ?", viewer, viewer)).map((x) => x.b),
  );
  const rows = await q.all("select * from trades where place_id = ? and hidden = 0 and at > ? and not (done_owner = 1 and done_partner = 1) order by at desc",
    placeId, since(STAY_MS));
  const out: Trade[] = [];
  for (const r of rows) {
    if (blocked.has(r.user_id as string)) continue;
    const offers = (await q.all<Offer>("select id, user_id uid, nick, give from offers where trade_id = ? order by at", r.id)).filter((o) => !blocked.has(o.uid));
    // Only the two people in an accepted trade see its meet-up code.
    const partner = offers.find((o) => o.id === r.accepted_offer)?.uid;
    const party = viewer === r.user_id || viewer === partner;
    out.push({
      id: r.id as string, uid: r.user_id as string, nick: r.nick as string, have: r.have as string, want: r.want as string,
      note: r.note as string, at: r.at as string, offers,
      accepted: r.accepted_offer ? { offerId: r.accepted_offer as string, code: party ? (r.code as string) : "" } : null,
      doneOwner: !!num(r.done_owner), donePartner: !!num(r.done_partner),
    });
  }
  return out;
}
export async function postTrade(placeId: string, userId: string, nick: string, have: string, want: string, note: string) {
  const open = num((await q.get("select count(*) c from trades where place_id = ? and user_id = ? and at > ? and not (done_owner = 1 and done_partner = 1)",
    placeId, userId, since(STAY_MS)))?.c);
  if (open >= 3) return null;
  const id = uid();
  await q.run("insert into trades (id, place_id, user_id, nick, have, want, note, at) values (?,?,?,?,?,?,?,?)", id, placeId, userId, nick, have, want, note, now());
  return id;
}
export async function offerTrade(tradeId: string, userId: string, nick: string, give: string) {
  const t = await q.get<{ user_id: string; accepted_offer: string | null }>("select user_id, accepted_offer from trades where id = ? and hidden = 0", tradeId);
  if (!t || t.accepted_offer || t.user_id === userId) return false;
  await q.run("insert into offers (id, trade_id, user_id, nick, give, at) values (?,?,?,?,?,?) on conflict do nothing", uid(), tradeId, userId, nick, give, now());
  return true;
}
export async function acceptOffer(tradeId: string, userId: string, offerId: string) {
  const ok = await q.get("select 1 x from offers where id = ? and trade_id = ?", offerId, tradeId);
  if (!ok) return false;
  const code = String(Math.floor(1000 + Math.random() * 9000));
  return (await q.run("update trades set accepted_offer = ?, code = ? where id = ? and user_id = ? and accepted_offer is null", offerId, code, tradeId, userId)) > 0;
}
/** A trade closes only when both the poster and the accepted partner confirm. */
export async function finishTrade(tradeId: string, userId: string) {
  const t = await q.get<{ user_id: string; accepted_offer: string | null }>("select user_id, accepted_offer from trades where id = ?", tradeId);
  if (!t?.accepted_offer) return false;
  const partner = (await q.get<{ user_id: string }>("select user_id from offers where id = ?", t.accepted_offer))?.user_id;
  if (userId === t.user_id) await q.run("update trades set done_owner = 1 where id = ?", tradeId);
  else if (userId === partner) await q.run("update trades set done_partner = 1 where id = ?", tradeId);
  else return false;
  return true;
}
export async function block(userId: string, targetId: string) {
  if (userId !== targetId) await q.run("insert into blocks (user_id, blocked_id) values (?,?) on conflict do nothing", userId, targetId);
}

// ---------- meal parties (같이 밥 먹기) ----------
// A host picks a Yumi partner, a time and how many people make the table. When that many fans
// have joined, the party books itself. The host's booking contact is kept only until that request.
export type MeetStatus = "open" | "requested" | "booked" | "failed";
export type Meet = {
  id: string; hostId: string; hostNick: string; anchor: string; anchorName: string; date: string; time: string; goal: number;
  place: { id: string; name: string } & Record<string, unknown>; intro: string; status: MeetStatus; reservationId: string | null; resError: string | null;
  members: { uid: string; nick: string; lang: string }[];
};
export type Contact = { name: string; phone: string; email?: string };
const toMeet = async (r: Row): Promise<Meet> => ({
  id: r.id as string, hostId: r.host_id as string, hostNick: r.host_nick as string, anchor: r.anchor as string,
  anchorName: r.anchor_name as string, date: r.date as string, time: r.time as string, goal: num(r.goal),
  place: JSON.parse(r.place_json as string), intro: r.intro as string, status: r.status as MeetStatus,
  reservationId: (r.reservation_id as string) ?? null, resError: (r.res_error as string) ?? null,
  members: await q.all<Meet["members"][number]>("select user_id uid, nick, lang from meet_members where meet_id = ? order by at", r.id),
});
export async function getMeet(id: string) {
  const r = await q.get("select * from meets where id = ? and hidden = 0", id);
  return r ? toMeet(r) : null;
}
/** Parties for the same venue and day, so fans at the same concert or cafe can find each other. */
export async function listMeets(anchor: string, date: string) {
  const rows = await q.all("select * from meets where anchor = ? and date = ? and hidden = 0 order by time, at limit 20", anchor, date);
  return Promise.all(rows.map(toMeet));
}
export async function createMeet(u: { id: string; nickname: string }, lang: string, m: { anchor: string; anchorName: string; date: string; time: string; goal: number; place: { id: string; name: string } & Record<string, unknown>; intro: string; contact: Contact }) {
  const open = num((await q.get("select count(*) c from meets where host_id = ? and status in ('open','requested')", u.id))?.c);
  if (open >= 3) return null;
  const id = uid().slice(0, 8);
  await q.run(`insert into meets (id, host_id, host_nick, anchor, anchor_name, date, time, max, goal, place_id, place_name, place_json, intro, contact_json, at)
    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, u.id, u.nickname, m.anchor, m.anchorName, m.date, m.time, m.goal, m.goal,
    m.place.id, m.place.name, JSON.stringify(m.place), m.intro, JSON.stringify(m.contact), now());
  await q.run("insert into meet_members (meet_id, user_id, nick, lang, at) values (?,?,?,?,?)", id, u.id, u.nickname, lang, now());
  return id;
}
export async function joinMeet(id: string, u: { id: string; nickname: string }, lang: string) {
  const m = await getMeet(id);
  if (!m || m.status !== "open") return "closed";
  if (m.members.some((x) => x.uid === u.id)) return "ok";
  if (m.members.length >= m.goal) return "full";
  await q.run("insert into meet_members (meet_id, user_id, nick, lang, at) values (?,?,?,?,?) on conflict do nothing", id, u.id, u.nickname, lang, now());
  return "ok";
}
export async function leaveMeet(id: string, userId: string) {
  await q.run("delete from meet_members where meet_id = ? and user_id = ? and user_id != (select host_id from meets where id = ?) and (select status from meets where id = ?) = 'open'",
    id, userId, id, id);
}
/** Claims the party for booking exactly once (two joins at the same moment can't double-book). */
export async function claimMeetBooking(id: string): Promise<Contact | null> {
  const r = await q.get<{ contact_json: string | null }>("select contact_json from meets where id = ? and status = 'open'", id);
  if (!r?.contact_json) return null;
  return (await q.run("update meets set status = 'requested', res_error = null where id = ? and status = 'open'", id)) > 0 ? JSON.parse(r.contact_json) : null;
}
export async function meetRequested(id: string, reservationId: string) {
  // The contact has done its job once HeyYumi has the request.
  await q.run("update meets set reservation_id = ?, contact_json = null where id = ?", reservationId, id);
}
export async function meetBookingFailed(id: string, why: string) {
  await q.run("update meets set status = 'open', res_error = ? where id = ? and status = 'requested'", why.slice(0, 80), id);
}
export async function setMeetStatus(id: string, status: MeetStatus, why?: string) {
  await q.run("update meets set status = ?, res_error = ? where id = ?", status, why ?? null, id);
}
