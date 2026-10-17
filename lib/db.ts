// Data access on the SQLite store: fan demand, food logs, fan events, and the in-store room
// (presence + photocard trades). Reports hide content automatically after REPORT_HIDE_AT.
import { db, now, uid } from "./sql";
import { REPORT_HIDE_AT } from "./guard";

const STAY_MS = 2 * 60 * 60 * 1000;
const since = (ms: number) => new Date(Date.now() - ms).toISOString();

// ---------- unmet fan demand (owner report) ----------
/** Counts each person once per venue (signed-in user id, or hashed IP for visitors). */
export function recordDemand(p: { id: string; name: string }, lang: string, userKey = "anon") {
  db().prepare("insert or ignore into demand (place_id, place_name, user_key, lang, at) values (?,?,?,?,?)").run(p.id, p.name, userKey, lang, now());
  return demandFor(p.id);
}
export const demandFor = (id: string) => (db().prepare("select count(*) c from demand where place_id = ?").get(id) as { c: number }).c;

export type Demand = { id: string; name: string; count: number; langs: Record<string, number>; last: string };
export function demandReport(placeId?: string | null): Demand[] {
  const rows = db().prepare(
    `select place_id id, place_name name, lang, count(*) n, max(at) last from demand ${placeId ? "where place_id = ?" : ""} group by place_id, lang`,
  ).all(...(placeId ? [placeId] : [])) as { id: string; name: string; lang: string; n: number; last: string }[];
  const by = new Map<string, Demand>();
  for (const r of rows) {
    const d = by.get(r.id) ?? { id: r.id, name: r.name, count: 0, langs: {}, last: "" };
    d.count += r.n;
    d.langs[r.lang] = r.n;
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
export function listLogs(viewer?: string | null): LogEntry[] {
  const rows = db().prepare(
    `select l.*, (select count(*) from log_likes k where k.log_id = l.id) likes,
       exists(select 1 from log_likes k where k.log_id = l.id and k.user_id = ?) liked
     from logs l where l.hidden = 0 order by l.at desc limit 200`,
  ).all(viewer ?? "") as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string, place: r.place as string, placeId: r.place_id as string | null, image: r.image as string | null,
    note: r.note as string, subject: r.subject as string | null, lang: r.lang as string, nickname: r.nickname as string,
    at: r.at as string, likes: Number(r.likes), liked: !!r.liked, demo: !!r.demo, mine: !!viewer && r.user_id === viewer,
  }));
}
export function addLog(userId: string, e: { place: string; placeId?: string | null; image?: string | null; note: string; subject?: string | null; lang: string; nickname: string }) {
  const id = uid();
  db().prepare("insert into logs (id, user_id, place, place_id, image, note, subject, lang, nickname, at) values (?,?,?,?,?,?,?,?,?,?)")
    .run(id, userId, e.place, e.placeId ?? null, e.image ?? null, e.note, e.subject ?? null, e.lang, e.nickname, now());
  return id;
}
export function likeLog(id: string, userId: string) {
  db().prepare("insert or ignore into log_likes (log_id, user_id) values (?,?)").run(id, userId);
  return (db().prepare("select count(*) c from log_likes where log_id = ?").get(id) as { c: number }).c;
}

// ---------- reports (any content) ----------
const TABLE: Record<string, string> = { log: "logs", event: "events", trade: "trades", meet: "meets" };
export function report(type: string, id: string, userId: string, reason: string) {
  const table = TABLE[type];
  if (!table) return false;
  db().prepare("insert or ignore into reports (target_type, target_id, user_id, reason, at) values (?,?,?,?,?)").run(type, id, userId, reason.slice(0, 60), now());
  const n = (db().prepare("select count(*) c from reports where target_type = ? and target_id = ?").get(type, id) as { c: number }).c;
  if (n >= REPORT_HIDE_AT) db().prepare(`update ${table} set hidden = 1 where id = ?`).run(id);
  return true;
}

// ---------- fan events (birthday cafes) ----------
export type FanEvent = {
  id: string; kind: "event" | "venue"; idol: string | null; venue: string | null; placeId: string | null; place: string | null;
  yumiReservable: boolean; lat: number | null; lng: number | null; road: string | null; dates: string[]; xUrl: string; author: string; text: string; at: string;
};
const toEvent = (r: Record<string, unknown>): FanEvent => ({
  id: r.id as string, kind: (r.kind as "event" | "venue") ?? "event", idol: r.idol as string | null, venue: r.venue as string | null,
  placeId: r.place_id as string | null, place: r.place as string | null, yumiReservable: !!r.yumi_reservable,
  lat: r.lat as number | null, lng: r.lng as number | null, road: r.road as string | null, dates: JSON.parse((r.dates as string) || "[]"),
  xUrl: r.x_url as string, author: r.author as string, text: r.text as string, at: r.at as string,
});
export const listEvents = () =>
  (db().prepare("select * from events where hidden = 0 order by kind asc, at desc").all() as Record<string, unknown>[]).map(toEvent);
export function addEvent(userId: string, e: Omit<FanEvent, "id" | "at" | "kind"> & { kind?: "event" | "venue" }) {
  const dup = db().prepare("select * from events where x_url = ?").get(e.xUrl) as Record<string, unknown> | undefined;
  if (dup) return toEvent(dup);
  const id = uid();
  db().prepare(`insert into events (id, kind, idol, venue, place_id, place, yumi_reservable, lat, lng, road, dates, x_url, author, text, created_by, at)
    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, e.kind ?? "event", e.idol, e.venue, e.placeId, e.place, e.yumiReservable ? 1 : 0,
    e.lat, e.lng, e.road, JSON.stringify(e.dates), e.xUrl, e.author, e.text, userId, now());
  return toEvent(db().prepare("select * from events where id = ?").get(id) as Record<string, unknown>);
}

// ---------- in-store room ----------
function purgeRoom() {
  db().prepare("delete from presence where at < ?").run(since(STAY_MS));
  db().prepare("delete from offers where trade_id in (select id from trades where at < ?)").run(since(24 * 3600000));
  db().prepare("delete from trades where at < ?").run(since(24 * 3600000));
}
export function joinRoom(placeId: string, userId: string, nick: string, lang: string) {
  purgeRoom();
  db().prepare("insert or replace into presence (place_id, user_id, nick, lang, at) values (?,?,?,?,?)").run(placeId, userId, nick, lang, now());
}
export const roomPeople = (placeId: string) =>
  db().prepare("select nick, lang from presence where place_id = ? and at > ?").all(placeId, since(STAY_MS)) as { nick: string; lang: string }[];
export const isHere = (placeId: string, userId: string) =>
  !!db().prepare("select 1 from presence where place_id = ? and user_id = ? and at > ?").get(placeId, userId, since(STAY_MS));

export type Offer = { id: string; uid: string; nick: string; give: string };
export type Trade = {
  id: string; uid: string; nick: string; have: string; want: string; note: string; at: string; offers: Offer[];
  accepted: { offerId: string; code: string } | null; doneOwner: boolean; donePartner: boolean;
};
/** Open trades in this store, minus hidden ones and anyone the viewer blocked (or who blocked them). */
export function roomTrades(placeId: string, viewer: string): Trade[] {
  const blocked = new Set(
    (db().prepare("select blocked_id b from blocks where user_id = ? union select user_id b from blocks where blocked_id = ?").all(viewer, viewer) as { b: string }[]).map((x) => x.b),
  );
  const rows = db().prepare("select * from trades where place_id = ? and hidden = 0 and at > ? and not (done_owner = 1 and done_partner = 1) order by at desc")
    .all(placeId, since(STAY_MS)) as Record<string, unknown>[];
  return rows.filter((r) => !blocked.has(r.user_id as string)).map((r) => {
    const offers = (db().prepare("select id, user_id uid, nick, give from offers where trade_id = ? order by at").all(r.id as string) as Offer[])
      .filter((o) => !blocked.has(o.uid));
    // Only the two people in an accepted trade see its meet-up code.
    const partner = offers.find((o) => o.id === r.accepted_offer)?.uid;
    const party = viewer === r.user_id || viewer === partner;
    return {
      id: r.id as string, uid: r.user_id as string, nick: r.nick as string, have: r.have as string, want: r.want as string,
      note: r.note as string, at: r.at as string, offers,
      accepted: r.accepted_offer ? { offerId: r.accepted_offer as string, code: party ? (r.code as string) : "" } : null,
      doneOwner: !!r.done_owner, donePartner: !!r.done_partner,
    };
  });
}
export function postTrade(placeId: string, userId: string, nick: string, have: string, want: string, note: string) {
  const open = (db().prepare("select count(*) c from trades where place_id = ? and user_id = ? and at > ? and not (done_owner = 1 and done_partner = 1)")
    .get(placeId, userId, since(STAY_MS)) as { c: number }).c;
  if (open >= 3) return null;
  const id = uid();
  db().prepare("insert into trades (id, place_id, user_id, nick, have, want, note, at) values (?,?,?,?,?,?,?,?)").run(id, placeId, userId, nick, have, want, note, now());
  return id;
}
export function offerTrade(tradeId: string, userId: string, nick: string, give: string) {
  const t = db().prepare("select user_id, accepted_offer from trades where id = ? and hidden = 0").get(tradeId) as { user_id: string; accepted_offer: string | null } | undefined;
  if (!t || t.accepted_offer || t.user_id === userId) return false;
  db().prepare("insert or ignore into offers (id, trade_id, user_id, nick, give, at) values (?,?,?,?,?,?)").run(uid(), tradeId, userId, nick, give, now());
  return true;
}
export function acceptOffer(tradeId: string, userId: string, offerId: string) {
  const ok = db().prepare("select 1 from offers where id = ? and trade_id = ?").get(offerId, tradeId);
  if (!ok) return false;
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const r = db().prepare("update trades set accepted_offer = ?, code = ? where id = ? and user_id = ? and accepted_offer is null").run(offerId, code, tradeId, userId);
  return r.changes > 0;
}
/** A trade closes only when both the poster and the accepted partner confirm. */
export function finishTrade(tradeId: string, userId: string) {
  const t = db().prepare("select user_id, accepted_offer from trades where id = ?").get(tradeId) as { user_id: string; accepted_offer: string | null } | undefined;
  if (!t?.accepted_offer) return false;
  const partner = (db().prepare("select user_id from offers where id = ?").get(t.accepted_offer) as { user_id: string } | undefined)?.user_id;
  if (userId === t.user_id) db().prepare("update trades set done_owner = 1 where id = ?").run(tradeId);
  else if (userId === partner) db().prepare("update trades set done_partner = 1 where id = ?").run(tradeId);
  else return false;
  return true;
}
export function block(userId: string, targetId: string) {
  if (userId !== targetId) db().prepare("insert or ignore into blocks (user_id, blocked_id) values (?,?)").run(userId, targetId);
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
const toMeet = (r: Record<string, unknown>): Meet => ({
  id: r.id as string, hostId: r.host_id as string, hostNick: r.host_nick as string, anchor: r.anchor as string,
  anchorName: r.anchor_name as string, date: r.date as string, time: r.time as string, goal: Number(r.goal),
  place: JSON.parse(r.place_json as string), intro: r.intro as string, status: r.status as MeetStatus,
  reservationId: (r.reservation_id as string) ?? null, resError: (r.res_error as string) ?? null,
  members: db().prepare("select user_id uid, nick, lang from meet_members where meet_id = ? order by at").all(r.id as string) as Meet["members"],
});
export function getMeet(id: string) {
  const r = db().prepare("select * from meets where id = ? and hidden = 0").get(id) as Record<string, unknown> | undefined;
  return r ? toMeet(r) : null;
}
/** Parties for the same venue and day, so fans at the same concert or cafe can find each other. */
export function listMeets(anchor: string, date: string) {
  return (db().prepare("select * from meets where anchor = ? and date = ? and hidden = 0 order by time, at limit 20").all(anchor, date) as Record<string, unknown>[]).map(toMeet);
}
export function createMeet(u: { id: string; nickname: string }, lang: string, m: { anchor: string; anchorName: string; date: string; time: string; goal: number; place: { id: string; name: string } & Record<string, unknown>; intro: string; contact: Contact }) {
  const open = (db().prepare("select count(*) c from meets where host_id = ? and status in ('open','requested')").get(u.id) as { c: number }).c;
  if (open >= 3) return null;
  const id = uid().slice(0, 8);
  db().prepare(`insert into meets (id, host_id, host_nick, anchor, anchor_name, date, time, max, goal, place_id, place_name, place_json, intro, contact_json, at)
    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, u.id, u.nickname, m.anchor, m.anchorName, m.date, m.time, m.goal, m.goal,
    m.place.id, m.place.name, JSON.stringify(m.place), m.intro, JSON.stringify(m.contact), now());
  db().prepare("insert into meet_members (meet_id, user_id, nick, lang, at) values (?,?,?,?,?)").run(id, u.id, u.nickname, lang, now());
  return id;
}
export function joinMeet(id: string, u: { id: string; nickname: string }, lang: string) {
  const m = getMeet(id);
  if (!m || m.status !== "open") return "closed";
  if (m.members.some((x) => x.uid === u.id)) return "ok";
  if (m.members.length >= m.goal) return "full";
  db().prepare("insert or ignore into meet_members (meet_id, user_id, nick, lang, at) values (?,?,?,?,?)").run(id, u.id, u.nickname, lang, now());
  return "ok";
}
export function leaveMeet(id: string, userId: string) {
  db().prepare("delete from meet_members where meet_id = ? and user_id = ? and user_id != (select host_id from meets where id = ?) and (select status from meets where id = ?) = 'open'").run(id, userId, id, id);
}
/** Claims the party for booking exactly once (two joins at the same moment can't double-book). */
export function claimMeetBooking(id: string): Contact | null {
  const r = db().prepare("select contact_json from meets where id = ? and status = 'open'").get(id) as { contact_json: string | null } | undefined;
  if (!r?.contact_json) return null;
  return db().prepare("update meets set status = 'requested', res_error = null where id = ? and status = 'open'").run(id).changes > 0 ? JSON.parse(r.contact_json) : null;
}
export function meetRequested(id: string, reservationId: string) {
  // The contact has done its job once HeyYumi has the request.
  db().prepare("update meets set reservation_id = ?, contact_json = null where id = ?").run(reservationId, id);
}
export function meetBookingFailed(id: string, why: string) {
  db().prepare("update meets set status = 'open', res_error = ? where id = ? and status = 'requested'").run(why.slice(0, 80), id);
}
export function setMeetStatus(id: string, status: MeetStatus, why?: string) {
  db().prepare("update meets set status = ?, res_error = ? where id = ?").run(status, why ?? null, id);
}
