import { NextResponse } from "next/server";
import { get, demandFor, YumiError } from "@/lib/yumi";
import { localize } from "@/lib/claude";

const won = (price: unknown) => {
  const n = Number(String(price ?? "").replace(/[^0-9]/g, ""));
  return n > 0 ? ` · ₩${n.toLocaleString()}` : "";
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = new URL(req.url).searchParams.get("lang") ?? "en";
  try {
    const res = await get(`/places/${id}`, { fields: "quality,edge,contact_hours,photos" });
    const p = res.data;
    const menu: string[] = (p.menu ?? []).slice(0, 8).map((m: any) => `${m.name}${won(m.price)}`);
    const [summary, ...menuLocal] = await localize([p.aiSummary ?? p.ownerIntro ?? "", ...menu], lang);
    return NextResponse.json({ place: p, summary, menu: menuLocal, fansTried: demandFor(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof YumiError ? e.status : 500 });
  }
}
