import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { demandReport, recordDemand } from "@/lib/db";
import { allow, clientKey, tooMany } from "@/lib/guard";

// Owners see only their own venue's demand.
export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== "owner") return NextResponse.json({ error: "owner_only" }, { status: 403 });
  return NextResponse.json({ report: demandReport(u.place_id) });
}

const Want = z.object({ id: z.string().max(20), name: z.string().max(80), lang: z.enum(["ko", "en", "ja", "zh"]).default("ko") });

// "I want to book here" on a venue that isn't a Yumi partner: one count per person per venue.
export async function POST(req: Request) {
  const u = await currentUser();
  const key = u?.id ?? clientKey(req);
  if (!allow(`demand:${key}`, 20, 600)) return tooMany();
  const p = Want.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return NextResponse.json({ fansTried: recordDemand({ id: p.data.id, name: p.data.name }, p.data.lang, key) });
}
