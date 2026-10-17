import { NextResponse } from "next/server";
import { YumiError } from "@/lib/yumi";
import { parseQuery } from "@/lib/claude";
import { runSearch } from "@/lib/search";

export async function POST(req: Request) {
  const { q, subject, lang } = (await req.json()) as { q?: string; subject?: string; lang?: string };
  if (!q?.trim() && !subject) return NextResponse.json({ error: "empty query" }, { status: 400 });

  try {
    // Topic chips send the subject directly; free text goes through the language layer.
    const parsed = subject
      ? { lang: lang ?? "ko", celebrity: subject, area: null, keyword: null, partySize: null }
      : await parseQuery(q!);
    if (lang) parsed.lang = lang;
    return NextResponse.json(await runSearch(parsed));
  } catch (e) {
    const status = e instanceof YumiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
