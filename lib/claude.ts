// Language layer only: understand the fan's question, translate notes for the owner,
// and localize Korean venue text for the fan. HeyYumi calls stay in plain REST.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-opus-5-5";
const enabled = () => Boolean(process.env.ANTHROPIC_API_KEY);
let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic());

const QuerySchema = z.object({
  lang: z.string().describe("ISO 639-1 code of the language the fan wrote in, e.g. en, ja, zh, es, ko"),
  celebrity: z
    .string()
    .nullable()
    .describe("Idol, group, actor or K-drama the fan named, in its Korean spelling (BTS stays 'BTS', Jungkook -> 정국)"),
  area: z.string().nullable().describe("Seoul area/station/landmark named, in Korean (Hongdae -> 홍대), else null"),
  keyword: z.string().nullable().describe("Dish or venue type in Korean (Korean BBQ -> 고기, bakery -> 베이커리), else null"),
  partySize: z.number().int().nullable(),
});
export type ParsedQuery = z.infer<typeof QuerySchema>;

const STARS: Record<string, string> = {
  jungkook: "정국", "jung kook": "정국", jimin: "지민", suga: "슈가", "j-hope": "제이홉", jhope: "제이홉",
  jin: "진", rm: "RM", v: "뷔", taehyung: "뷔", bts: "BTS", lisa: "리사", blackpink: "블랙핑크",
  "jensen huang": "젠슨 황", jensen: "젠슨 황", "culinary class wars": "흑백요리사", "black and white chef": "흑백요리사",
};

function detectLang(text: string) {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  return "en";
}

function heuristicParse(q: string): ParsedQuery {
  const lower = q.toLowerCase();
  const hit = Object.keys(STARS)
    .sort((a, b) => b.length - a.length)
    .find((k) => new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(lower));
  const ko = q.match(/(젠슨 ?황|흑백요리사|정국|지민|슈가|제이홉|RM|뷔|BTS|방탄)/);
  return {
    lang: detectLang(q),
    celebrity: hit ? STARS[hit] : ko ? ((({ 방탄: "BTS", 젠슨황: "젠슨 황" }) as Record<string, string>)[ko[1]] ?? ko[1]) : null,
    area: null,
    keyword: null,
    partySize: Number(q.match(/(\d+)\s*(people|명|人|pax)/i)?.[1]) || null,
  };
}

export async function parseQuery(q: string): Promise<ParsedQuery> {
  if (!enabled()) return heuristicParse(q);
  try {
    const res = await claude().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(QuerySchema) },
      system:
        "You turn a K-pop fan's restaurant question into search fields for a Korean venue database. " +
        "Write celebrity, area and keyword in Korean. Use null for anything not mentioned.",
      messages: [{ role: "user", content: q }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return heuristicParse(q);
    return res.parsed_output;
  } catch {
    return heuristicParse(q);
  }
}

async function text(system: string, content: string): Promise<string | null> {
  if (!enabled()) return null;
  try {
    const res = await claude().messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return null;
    return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim() || null;
  } catch {
    return null;
  }
}

/** Fan's free-text request -> polite Korean note for the owner (keeps the original too). */
export async function noteForOwner(note: string, lang: string, guestCount: number) {
  const header = `[해외 팬 예약 · ${lang.toUpperCase()} · ${guestCount}명]`;
  if (!note.trim()) return `${header} 한국어가 서툰 해외 손님이에요. 이메일로 연락해 주세요.`;
  if (lang === "ko") return `${header} ${note}`;
  const ko = await text(
    "Translate the guest's message into short, polite Korean for a restaurant owner. Output only the Korean text.",
    note,
  );
  return ko ? `${header} ${ko}\n(원문: ${note})` : `${header} ${note}`;
}

const LocalizedSchema = z.object({ items: z.array(z.string()) });

/** Localize a batch of Korean strings into the fan's language in one call. */
export async function localize(strings: string[], lang: string): Promise<string[]> {
  if (lang === "ko" || !enabled() || strings.length === 0) return strings;
  try {
    const res = await claude().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "low", format: zodOutputFormat(LocalizedSchema) },
      system:
        `Translate each item into ${lang}. Keep venue names, addresses, numbers, prices and URLs exactly as given; ` +
        "add a romanization in parentheses after Korean venue names. Say a celebrity 'reportedly visited', never 'endorsed'. " +
        "Return the same number of items in the same order.",
      messages: [{ role: "user", content: JSON.stringify(strings) }],
    });
    const out = res.parsed_output?.items;
    return out && out.length === strings.length ? out : strings;
  } catch {
    return strings;
  }
}
