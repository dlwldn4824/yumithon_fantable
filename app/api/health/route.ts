import { NextResponse } from "next/server";
import { q } from "@/lib/sql";

// Deployment check: which settings are present (never their values) and whether the database answers.
export async function GET() {
  const set = (k: string) => !!process.env[k];
  let database = "ok";
  try { await q.get("select 1 x"); } catch (e) { database = (e as Error).message.slice(0, 160); }
  return NextResponse.json({
    env: { HEYYUMI_API_KEY: set("HEYYUMI_API_KEY"), DATABASE_URL: set("DATABASE_URL"), SESSION_SECRET: set("SESSION_SECRET"), HEYYUMI_SANDBOX: process.env.HEYYUMI_SANDBOX ?? null },
    database,
  }, { headers: { "cache-control": "no-store" } });
}
