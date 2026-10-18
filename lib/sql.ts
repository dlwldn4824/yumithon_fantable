// Storage: Postgres (Neon) when DATABASE_URL is set — the Vercel deployment — otherwise a local
// SQLite file under .data/ for development. Both speak the same SQL through q.all / q.get / q.run,
// written with `?` placeholders (rewritten to $1, $2… for Postgres).
import fs from "node:fs";
import path from "node:path";
import seed from "./seed.json";

export type Row = Record<string, unknown>;
type Driver = { all(sql: string, p: unknown[]): Promise<Row[]>; run(sql: string, p: unknown[]): Promise<number> };

const DIR = path.join(process.cwd(), ".data");
const g = globalThis as unknown as { __driver?: Promise<Driver>; __driverSchema?: string };

const SCHEMA = `
create table if not exists users (
  id text primary key, email text unique not null, nickname text not null, pw_hash text not null,
  role text not null default 'fan', place_id text, age_ok integer not null default 0,
  consent_at text not null, created_at text not null, kakao_id text
);
create unique index if not exists users_kakao on users(kakao_id) where kakao_id is not null;
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
const statements = () => SCHEMA.split(";").map((s) => s.trim()).filter(Boolean);

async function postgres(url: string): Promise<Driver> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url, { fullResults: true });
  const pg = (text: string) => { let i = 0; return text.replace(/\?/g, () => `$${++i}`); };
  const d: Driver = {
    all: async (text, p) => (await sql.query(pg(text), p)).rows as Row[],
    run: async (text, p) => (await sql.query(pg(text), p)).rowCount ?? 0,
  };
  for (const s of statements()) await d.run(s, []);
  return d;
}

async function sqlite(): Promise<Driver> {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DIR, "app.db"));
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on;");
  // Columns added after a local table was first created (SQLite has no "add column if not exists").
  const cols = (t: string) => new Set((db.prepare(`pragma table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
  for (const s of statements()) {
    try { db.exec(s); } catch { /* an index on a column the old table lacks; added below */ }
  }
  if (!cols("users").has("kakao_id")) db.exec("alter table users add column kakao_id text");
  db.exec("create unique index if not exists users_kakao on users(kakao_id) where kakao_id is not null");
  const meets = cols("meets");
  for (const [c, def] of [["goal", "integer not null default 2"], ["intro", "text not null default ''"], ["contact_json", "text"], ["res_error", "text"]])
    if (!meets.has(c)) db.exec(`alter table meets add column ${c} ${def}`);
  type P = (string | number | null)[];
  return {
    all: async (text, p) => db.prepare(text).all(...(p as P)) as Row[],
    run: async (text, p) => Number(db.prepare(text).run(...(p as P)).changes),
  };
}

/** Example events and labeled demo logs, loaded once into an empty database. */
async function seedIfEmpty(d: Driver) {
  const n = Number((await d.all("select count(*) c from events", []))[0]?.c ?? 0) + Number((await d.all("select count(*) c from logs", []))[0]?.c ?? 0);
  if (n > 0) return;
  for (const e of seed.events as Row[])
    await d.run(`insert into events (id, kind, idol, venue, place_id, place, yumi_reservable, lat, lng, road, dates, x_url, author, text, at)
      values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) on conflict do nothing`,
      [e.id, e.kind, e.idol, e.venue, e.place_id, e.place, e.yumi_reservable, e.lat, e.lng, e.road, e.dates, e.x_url, e.author, e.text, e.at]);
  for (const l of seed.logs as Row[])
    await d.run(`insert into logs (id, place, place_id, image, note, subject, lang, nickname, at, demo) values (?,?,?,?,?,?,?,?,?,?) on conflict do nothing`,
      [l.id, l.place, l.place_id, l.image, l.note, l.subject, l.lang, l.nickname, l.at, l.demo]);
}

function driver() {
  // Dev hot reload keeps the connection; a schema change since then opens a fresh one.
  if (!g.__driver || g.__driverSchema !== SCHEMA) {
    g.__driverSchema = SCHEMA;
    g.__driver = (async () => {
      const d = process.env.DATABASE_URL ? await postgres(process.env.DATABASE_URL) : await sqlite();
      await seedIfEmpty(d);
      return d;
    })().catch((e) => { g.__driver = undefined; throw e; });
  }
  return g.__driver;
}

export const q = {
  all: async <T = Row>(sql: string, ...p: unknown[]) => (await (await driver()).all(sql, p)) as T[],
  get: async <T = Row>(sql: string, ...p: unknown[]) => ((await (await driver()).all(sql, p))[0] as T | undefined),
  /** Returns the number of rows changed. */
  run: async (sql: string, ...p: unknown[]) => (await driver()).run(sql, p),
};
/** count(*) comes back as a string from Postgres and a number from SQLite. */
export const num = (v: unknown) => Number(v ?? 0);

export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
