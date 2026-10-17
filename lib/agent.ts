// Buddy: the fan's travel concierge. With a Claude key it runs a tool-use loop over
// HeyYumi; without one it falls back to simple intent rules so the demo still works.
import Anthropic from "@anthropic-ai/sdk";
import type { Place } from "@/lib/yumi";
import { runSearch, partnersAround, askOwnersNow, type LiveAnswer, type SearchPayload } from "@/lib/search";
import { readXPost, matchVenue, X_URL, type XPost } from "@/lib/xpost";
import { subjectName } from "@/lib/subjects";
import { romanize } from "@/lib/romanize";
import type { Lang } from "@/lib/i18n";
import { ANCHORS } from "@/lib/anchors";
import { planAround, resolveAnchor, seoulNow } from "@/lib/plan";

// Area names as a fan would read them in each language.
const AREA_NAME: Record<string, [string, string]> = { // ja, zh
  명동: ["明洞", "明洞"], 홍대: ["弘大", "弘大"], 성수: ["聖水", "圣水"], 을지로: ["乙支路", "乙支路"], 강남: ["江南", "江南"],
  이태원: ["梨泰院", "梨泰院"], 종로: ["鍾路", "钟路"], 잠실: ["蚕室", "蚕室"], 인사동: ["仁寺洞", "仁寺洞"], 압구정: ["狎鴎亭", "狎鸥亭"],
};
const areaIn = (a: string, lang: string) =>
  lang === "ko" ? a : lang === "ja" ? AREA_NAME[a]?.[0] ?? romanize(a) : lang === "zh" ? AREA_NAME[a]?.[1] ?? romanize(a) : romanize(a);

export type Card =
  | { type: "famous"; result: SearchPayload["results"][number] }
  | { type: "place"; place: Place & { image?: string | null }; when?: { date: string; time: string; party: number } }
  | { type: "live"; place: Place & { image?: string | null }; answer: LiveAnswer }
  | { type: "xpost"; post: XPost; match: Place | null };

export type Turn = { role: "user" | "assistant"; text: string };
type ToolOut = { summary: string; cards: Card[] };

const SUBJECT_WORDS: [RegExp, string][] = [
  [/젠슨\s?황|jensen|ジェンスン|黄仁勋/i, "젠슨 황"], [/흑백요리사|culinary class|black.?and.?white chef|白と黒|黑白厨师/i, "흑백요리사"],
  [/정국|jungkook|jung kook|ジョングク|田柾国/i, "정국"], [/지민|jimin|ジミン|朴智旻/i, "지민"],
  [/\bRM\b|남준|namjoon/i, "RM"], [/뷔|\bV\b|taehyung|テテ|金泰亨/i, "뷔"], [/슈가|suga|ユンギ|闵玧其/i, "슈가"],
  [/제이홉|j-?hope|ホソク|郑号锡/i, "제이홉"], [/\b진\b|석진|\bjin\b|ジン|金硕珍/i, "진"],
  [/BTS|방탄|防弾|防弹/i, "BTS"],
];
const AREAS: [RegExp, string][] = [
  [/명동|myeong-?dong|明洞/i, "명동"], [/홍대|hongdae|弘大/i, "홍대"], [/성수|seongsu|聖水|圣水/i, "성수"],
  [/을지로|euljiro|乙支路/i, "을지로"], [/강남|gangnam|江南/i, "강남"], [/이태원|itaewon|梨泰院/i, "이태원"],
  [/종로|jongno|鍾路|钟路/i, "종로"], [/한남|hannam/i, "한남"], [/신촌|sinchon/i, "신촌"], [/잠실|jamsil|蚕室/i, "잠실"],
  [/연남|yeonnam/i, "연남"], [/압구정|apgujeong|狎鴎亭/i, "압구정"], [/인사동|insadong|仁寺洞/i, "인사동"], [/북촌|bukchon/i, "북촌"],
];
const FOODS: [RegExp, string][] = [
  [/냉면|naengmyeon|cold noodle|冷麺|冷面/i, "냉면"], [/삼겹살|bbq|고기|barbecue|焼肉|烤肉/i, "삼겹살"],
  [/치킨|chicken|チキン|炸鸡/i, "치킨"], [/카페|cafe|café|coffee|커피|カフェ|咖啡/i, "커피"], [/국밥|soup|クッパ|汤饭/i, "국밥"],
];
const NOW = /지금|바로|now|right away|今すぐ|今|现在|马上/i;
// Concert venues and fan neighborhoods from the route tab.
const VENUES: [RegExp, string][] = [
  [/kspo|올림픽공원|olympic park|オリンピック公園|奥林匹克公园/i, "kspo"], [/고척|gocheok|高尺/i, "gocheok"],
  [/고양종합|goyang|高陽|高阳/i, "goyang"], [/인스파이어|inspire/i, "inspire"], [/하이브|hybe/i, "hybe"],
];
const AFTER = /끝나고|끝난|이후|after|終演|散场|结束后/i;
/** "22시", "10pm", "22:00" → HH:MM; after-show defaults to 21:30, otherwise the next half hour. */
function whenOf(text: string) {
  const n = seoulNow();
  const hm = text.match(/(\d{1,2}):(\d{2})/) ?? text.match(/(\d{1,2})\s*(시|時|点|pm|PM)/);
  if (hm) {
    let h = Number(hm[1]);
    if (/pm/i.test(hm[2] ?? "") && h < 12) h += 12;
    return { date: n.date, time: `${String(Math.min(h, 23)).padStart(2, "0")}:${hm[2] && /^\d{2}$/.test(hm[2]) ? hm[2] : "00"}` };
  }
  return { date: n.date, time: AFTER.test(text) ? "21:30" : n.time };
}

const match = (text: string, table: [RegExp, string][]) => table.find(([re]) => re.test(text))?.[1] ?? null;
export const detectSubject = (text: string) => match(text, SUBJECT_WORDS);
const partyOf = (text: string) => Number(text.match(/(\d+)\s*(명|people|persons?|pax|人|名)/i)?.[1]) || 2;

// ---- tools (shared by both paths) ----
async function toolFamous(subject: string, lang: string): Promise<ToolOut> {
  const r = await runSearch({ lang, celebrity: subject, area: null, keyword: null, partySize: null });
  const cards: Card[] = r.results.slice(0, 4).map((result) => ({ type: "famous", result }));
  const near = [...new Map(r.results.flatMap((x) => x.alternatives).map((a) => [a.id, a])).values()].slice(0, 3);
  cards.push(...near.map((place) => ({ type: "place" as const, place })));
  return {
    summary: `${r.stats.spots} famous spots linked to ${subject}; ${r.stats.bookable} bookable directly. ` +
      `Spots: ${r.results.map((x) => x.place.name).join(", ")}. Bookable Yumi partners nearby: ${near.map((p) => p.name).join(", ") || "none"}.`,
    cards,
  };
}

async function toolArea(area: string, food: string | null): Promise<ToolOut> {
  const { places } = await partnersAround(area, food, 4);
  return {
    summary: places.length ? `Bookable Yumi partners in ${area}${food ? ` for ${food}` : ""}: ${places.map((p) => p.name).join(", ")}.` : `No bookable Yumi partner found in ${area}.`,
    cards: places.map((place) => ({ type: "place", place })),
  };
}

async function toolNow(area: string, party: number): Promise<ToolOut> {
  const { places } = await partnersAround(area, null, 4);
  const answers = await askOwnersNow(places.map((p) => p.id), party);
  const cards: Card[] = places.map((place, i) => ({ type: "live", place, answer: answers[i] }));
  const ok = cards.filter((c) => c.type === "live" && ["available", "limited"].includes(c.answer.status));
  return {
    summary: `Asked ${places.length} owners in ${area} if ${party} people can come now. ` +
      places.map((p, i) => `${p.name}: ${answers[i].status}`).join("; "),
    cards: [...ok, ...cards.filter((c) => !ok.includes(c))],
  };
}

async function toolVenue(key: string, text: string, lang: string): Promise<ToolOut & { venue: string; time: string }> {
  const at = await resolveAnchor(key);
  const when = whenOf(text);
  const party = partyOf(text);
  const venue = ANCHORS.find((a) => a.key === key)?.name[lang as Lang] ?? key;
  if (!at) return { summary: "Unknown venue", cards: [], venue, time: when.time };
  const r = await planAround({ lat: at.lat, lng: at.lng, date: when.date, time: when.time, wide: at.anchor.kind === "concert" || undefined, walk: false });
  const cards: Card[] = r.bookable.slice(0, 4).map((p) => ({ type: "place", place: p as unknown as Place, when: { ...when, party } }));
  return {
    summary: `Bookable Yumi partners open at ${when.time} near ${venue}: ${r.bookable.map((p) => p.name).join(", ") || "none"}.`,
    cards, venue, time: when.time,
  };
}

async function toolX(url: string): Promise<ToolOut> {
  const post = await readXPost(url);
  if (!post) return { summary: "Could not read that X post (it may be private or deleted).", cards: [] };
  const found = post.venue ? await matchVenue(post.venue) : null;
  return {
    summary: `X post by @${post.author}: "${post.text.slice(0, 200)}". Venue line: ${post.venue ?? "none"}. Dates: ${post.dates.join(", ") || "none"}. ` +
      (found ? `Matched on HeyYumi: ${found.name} (${found.yumiReservable ? "bookable" : "not bookable yet"}).` : "No HeyYumi match."),
    cards: [{ type: "xpost", post, match: found }],
  };
}

// ---- fallback replies (no Claude key) ----
const R: Record<string, Record<string, string>> = {
  ko: {
    famous: "{s}{ga} 다녀간 것으로 알려진 곳들이에요. 대부분 바로 예약이 안 돼서, 근처에서 지금 예약되는 곳도 같이 골라뒀어요.",
    area: "{a}에서 바로 예약 요청할 수 있는 곳이에요.", now: "{a} 근처 사장님들께 {n}명 지금 바로 되는지 물어봤어요.",
    x: "X 게시물을 읽었어요.", xMatch: " 장소는 「{v}」로 보여요. 유미에서 찾았어요.", xNo: " 장소를 유미에서 찾지 못했어요.",
    venue: "{v} 근처, {t}에 문 열고 유미로 바로 예약되는 곳이에요.", venueNone: "{v} 근처엔 {t}에 유미로 예약되는 곳이 아직 없어요. 동선 탭에서 걸어갈 수 있는 열린 곳을 볼 수 있어요.",
    help: "누가 다녀간 곳(예: 젠슨 황, 정국), 동네(예: 명동 냉면), 또는 \"지금 명동 2명\"처럼 말해 주세요. X 게시물 링크를 붙여넣어도 돼요.",
  },
  en: {
    famous: "Here are places {s} reportedly visited. Most can’t be booked directly, so I also picked nearby spots you can book now.",
    area: "Here are places in {a} you can request right in the app.", now: "I asked owners around {a} if {n} people can come in right now.",
    x: "I read the X post.", xMatch: " The venue looks like “{v}” — I found it on Yumi.", xNo: " I couldn’t find that venue on Yumi.",
    venue: "Near {v}, open at {t} and bookable with Yumi right now.", venueNone: "Near {v}, nothing is bookable with Yumi at {t} yet. The Route tab shows open places within walking distance.",
    help: "Tell me who you’re following (e.g. Jensen Huang, Jungkook), an area (e.g. naengmyeon in Myeongdong), or “2 people now in Myeongdong”. You can also paste an X post link.",
  },
  ja: {
    famous: "{s}が訪れたとされるお店です。多くは直接予約できないので、近くで今すぐ予約できるお店も選びました。",
    area: "{a}でアプリから予約リクエストできるお店です。", now: "{a}周辺の店主に{n}名すぐ入れるか聞きました。",
    x: "Xの投稿を読みました。", xMatch: " 場所は「{v}」のようです。Yumiで見つかりました。", xNo: " その場所はYumiで見つかりませんでした。",
    venue: "{v}の近くで、{t}に営業していてYumiですぐ予約できるお店です。", venueNone: "{v}の近くには、{t}にYumiで予約できるお店がまだありません。ルートタブで歩いて行ける営業中の店を見られます。",
    help: "推し（例：ジェンスン・フアン、ジョングク）、エリア（例：明洞 冷麺）、または「明洞で今2名」のように話しかけてください。Xの投稿リンクも貼れます。",
  },
  zh: {
    famous: "这些是据报道{s}去过的餐厅。大多无法直接预订，所以我也选了附近现在就能预订的地方。",
    area: "这些是{a}可以在应用内直接预订的餐厅。", now: "我问了{a}附近的店主，{n}人现在能不能进。",
    x: "我读取了这条X帖子。", xMatch: " 地点看起来是「{v}」，已在Yumi找到。", xNo: " 在Yumi上没有找到这个地点。",
    venue: "{v}附近，{t}营业且可以马上用Yumi预订的店。", venueNone: "{v}附近{t}还没有可用Yumi预订的店。可以在「路线」查看步行可达的营业店。",
    help: "告诉我你追的人（如黄仁勋、田柾国）、区域（如明洞 冷面），或「明洞 现在2人」。也可以粘贴X帖子链接。",
  },
};
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
// Korean subject particle: 이 after a final consonant, 가 otherwise (정국이, 지민이, 슈가가).
export const ga = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "이" : "가";
};

async function fallback(text: string, lang: string): Promise<{ reply: string; cards: Card[] }> {
  const T = R[lang] ?? R.en;
  const url = text.match(X_URL)?.[0];
  if (url) {
    const out = await toolX(url);
    const c = out.cards[0];
    const v = c?.type === "xpost" ? c.post.venue : null;
    return { reply: T.x + (c?.type === "xpost" && c.match ? fill(T.xMatch, { v: v ?? "" }) : T.xNo), cards: out.cards };
  }
  const venue = match(text, VENUES);
  if (venue) {
    const out = await toolVenue(venue, text, lang);
    return { reply: fill(out.cards.length ? T.venue : T.venueNone, { v: out.venue, t: out.time }), cards: out.cards };
  }
  const area = match(text, AREAS);
  const subject = match(text, SUBJECT_WORDS);
  if (area && NOW.test(text)) {
    const n = partyOf(text);
    return { reply: fill(T.now, { a: areaIn(area, lang), n }), cards: (await toolNow(area, n)).cards };
  }
  if (subject) return { reply: fill(T.famous, { s: subjectName(subject, lang as Lang), ga: ga(subject) }), cards: (await toolFamous(subject, lang)).cards };
  if (area) return { reply: fill(T.area, { a: areaIn(area, lang) }), cards: (await toolArea(area, match(text, FOODS))).cards };
  return { reply: T.help, cards: [] };
}

// ---- Claude path ----
const TOOLS: Anthropic.Tool[] = [
  {
    name: "find_famous_spots",
    description: "Find Seoul restaurants/cafes publicly reported as visited by a celebrity or featured on a show, plus bookable Yumi partners near them. subject must be in Korean (젠슨 황, 흑백요리사, BTS, 정국, 지민, RM, 뷔, 슈가).",
    input_schema: { type: "object", properties: { subject: { type: "string" } }, required: ["subject"] },
  },
  {
    name: "find_bookable_places",
    description: "Find Yumi partner venues (bookable inside this app) around a Seoul area. area in Korean (명동, 홍대, 성수...). food optional, a Korean dish word (냉면, 삼겹살, 치킨, 커피, 국밥).",
    input_schema: { type: "object", properties: { area: { type: "string" }, food: { type: "string" } }, required: ["area"] },
  },
  {
    name: "ask_owners_now",
    description: "Ask owners of up to 4 Yumi partners around an area, at the same time, whether a party can be seated right now. Use only for right-now requests. area in Korean.",
    input_schema: { type: "object", properties: { area: { type: "string" }, party: { type: "integer" } }, required: ["area", "party"] },
  },
  {
    name: "find_near_venue",
    description: "Find Yumi partners open at a given time near a concert venue (kspo = KSPO DOME/Olympic Park, gocheok = Gocheok Sky Dome, goyang = Goyang Stadium, inspire = Inspire Arena, hybe = HYBE Yongsan). Use for 'after the concert' questions. when_text: the user's words about time and party size.",
    input_schema: { type: "object", properties: { venue: { type: "string", enum: ["kspo", "gocheok", "goyang", "inspire", "hybe"] }, when_text: { type: "string" } }, required: ["venue"] },
  },
  {
    name: "read_x_post",
    description: "Read a public X (Twitter) post the user pasted, e.g. a fan birthday-cafe announcement, extract the venue and dates, and look the venue up on Yumi.",
    input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  },
];

async function runTool(name: string, input: Record<string, unknown>, lang: string): Promise<ToolOut> {
  try {
    if (name === "find_famous_spots") return await toolFamous(String(input.subject), lang);
    if (name === "find_bookable_places") return await toolArea(String(input.area), (input.food as string) ?? null);
    if (name === "ask_owners_now") return await toolNow(String(input.area), Number(input.party) || 2);
    if (name === "find_near_venue") return await toolVenue(String(input.venue), String(input.when_text ?? ""), lang);
    if (name === "read_x_post") return await toolX(String(input.url));
    return { summary: `Unknown tool ${name}`, cards: [] };
  } catch (e) {
    return { summary: `Tool failed: ${(e as Error).message}`, cards: [] };
  }
}

export async function chat(history: Turn[], lang: string): Promise<{ reply: string; cards: Card[] }> {
  const last = history[history.length - 1]?.text ?? "";
  if (!process.env.ANTHROPIC_API_KEY) return fallback(last, lang);

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((t) => ({ role: t.role, content: t.text }));
  const cards: Card[] = [];
  try {
    for (let step = 0; step < 5; step++) {
      const res = await client.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        output_config: { effort: "low" },
        system:
          "You are Buddy, a food concierge for overseas fans visiting Seoul. Reply in the user's language, in 1–3 short sentences. " +
          "Use the tools for any place question; never invent venues. Say a celebrity 'reportedly visited', never 'endorsed'. " +
          "You cannot book by yourself: results appear as cards under your message and the user taps Book on a card. " +
          "Never say a table is confirmed. If a famous spot isn't bookable, point to the bookable spots nearby.",
        tools: TOOLS,
        messages,
      });
      if (res.stop_reason === "refusal") break;
      const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || uses.length === 0) {
        const reply = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
        return { reply, cards };
      }
      messages.push({ role: "assistant", content: res.content });
      const outs = await Promise.all(uses.map((u) => runTool(u.name, u.input as Record<string, unknown>, lang)));
      outs.forEach((o) => cards.push(...o.cards));
      messages.push({
        role: "user",
        content: uses.map((u, i) => ({ type: "tool_result" as const, tool_use_id: u.id, content: outs[i].summary })),
      });
    }
  } catch {
    // Fall through to the rule-based path if the model call fails.
  }
  const fb = await fallback(last, lang);
  return { reply: fb.reply, cards: cards.length ? cards : fb.cards };
}
