// SQLite store (Node's built-in driver). One file under .data/, schema created on first use.
// Tables mirror what a Postgres deployment would hold, so moving later is a driver swap.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DIR = path.join(process.cwd(), ".data");
const g = globalThis as unknown as { __sql?: DatabaseSync; __sqlSchema?: string };

const SCHEMA = `
create table if not exists users (
  id text primary key, email text unique not null, nickname text not null, pw_hash text not null,
  role text not null default 'fan', place_id text, age_ok integer not null default 0,
  consent_at text not null, created_at text not null
);
create table if not exists demand (
  place_id text not null, place_name text not null, user_key text not null, lang text not null, at text not null,
  primary key (place_id, user_key)
);
create table if not exists logs (
  id text primary key, user_id text, place text not null, place_id text, image text, note text not null,
  subject text, lang text not null, nickname text not null, at text not null, demo integer not null default 0, hidden integer not null default 0
);
create table if not exists log_likes (log_id text not null, user_id text not null, primary key (log_id, user_id));
create table if not exists events (
  id text primary key, kind text not null default 'event', idol text, venue text, place_id text, place text,
  yumi_reservable integer not null default 0, lat real, lng real, road text, dates text not null default '[]',
  x_url text unique not null, author text not null default '', text text not null default '',
  created_by text, at text not null, hidden integer not null default 0
);
create table if not exists presence (
  place_id text not null, user_id text not null, nick text not null, lang text not null, at text not null,
  primary key (place_id, user_id)
);
create table if not exists trades (
  id text primary key, place_id text not null, user_id text not null, nick text not null,
  have text not null, want text not null, note text not null default '', at text not null,
  accepted_offer text, code text, done_owner integer not null default 0, done_partner integer not null default 0, hidden integer not null default 0
);
create table if not exists offers (
  id text primary key, trade_id text not null, user_id text not null, nick text not null, give text not null, at text not null,
  unique (trade_id, user_id)
);
create table if not exists reports (
  target_type text not null, target_id text not null, user_id text not null, reason text not null, at text not null,
  primary key (target_type, target_id, user_id)
);
create table if not exists blocks (user_id text not null, blocked_id text not null, primary key (user_id, blocked_id));
create table if not exists meets (
  id text primary key, host_id text not null references users(id) on delete cascade, host_nick text not null,
  anchor text not null, anchor_name text not null, date text not null, time text not null, max integer not null,
  place_id text not null, place_name text not null, place_json text not null, title text not null default '',
  status text not null default 'open', reservation_id text, hidden integer not null default 0, at text not null,
  goal integer not null default 2, intro text not null default '', contact_json text, res_error text
);
create table if not exists meet_members (
  meet_id text not null references meets(id) on delete cascade, user_id text not null references users(id) on delete cascade,
  nick text not null, lang text not null, at text not null, primary key (meet_id, user_id)
);
`;

export function db() {
  if (g.__sql) {
    // Dev hot reload keeps the connection; apply tables added since it was opened.
    if (g.__sqlSchema !== SCHEMA) { g.__sql.exec(SCHEMA); migrate(g.__sql); g.__sqlSchema = SCHEMA; }
    return g.__sql;
  }
  fs.mkdirSync(DIR, { recursive: true });
  const d = new DatabaseSync(path.join(DIR, "app.db"));
  d.exec("pragma journal_mode = wal; pragma foreign_keys = on;");
  d.exec(SCHEMA);
  migrate(d);
  g.__sql = d;
  g.__sqlSchema = SCHEMA;
  importLegacyJson(d);
  return d;
}

/** Columns added after a table was first created (SQLite has no "add column if not exists"). */
function migrate(d: DatabaseSync) {
  const cols = (t: string) => new Set((d.prepare(`pragma table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
  const users = cols("users");
  if (!users.has("kakao_id")) d.exec("alter table users add column kakao_id text");
  d.exec("create unique index if not exists users_kakao on users(kakao_id) where kakao_id is not null");
  const meets = cols("meets");
  for (const [c, def] of [["goal", "integer not null default 2"], ["intro", "text not null default ''"], ["contact_json", "text"], ["res_error", "text"]])
    if (!meets.has(c)) d.exec(`alter table meets add column ${c} ${def}`);
}

export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();

/** One-time import of the demo data that lived in .data/db.json before the SQLite store. */
function importLegacyJson(d: DatabaseSync) {
  const file = path.join(DIR, "db.json");
  if (!fs.existsSync(file)) return;
  const count = (d.prepare("select count(*) c from events").get() as { c: number }).c + (d.prepare("select count(*) c from logs").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    const ev = d.prepare(`insert or ignore into events (id, kind, idol, venue, place_id, place, yumi_reservable, lat, lng, road, dates, x_url, author, text, at)
      values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const e of j.events ?? [])
      ev.run(e.id, e.kind ?? "event", e.idol ?? null, e.venue ?? null, e.placeId ?? null, e.place ?? null, e.yumiReservable ? 1 : 0,
        e.lat ?? null, e.lng ?? null, e.road ?? null, JSON.stringify(e.dates ?? []), e.xUrl, e.author ?? "", e.text ?? "", e.at);
    const lg = d.prepare(`insert or ignore into logs (id, place, place_id, image, note, subject, lang, nickname, at, demo) values (?,?,?,?,?,?,?,?,?,?)`);
    for (const l of j.logs ?? [])
      lg.run(l.id, l.place, l.placeId ?? null, l.image ?? null, l.note ?? "", l.subject ?? null, l.lang ?? "ko", l.nickname ?? "Fan", l.at, l.demo ? 1 : 0);
    fs.renameSync(file, file + ".imported");
  } catch {
    // Leave the JSON in place if it can't be read; the app starts empty.
  }
}
