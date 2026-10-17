// The people and shows a fan can browse by, with names in each UI language.
import type { Lang } from "./i18n";

type L4 = Record<Lang, string>;
export const SUBJECTS: { key: string; name: L4; kind: L4; icon: "chip" | "chef" | "mic" | "star" | "note" | "headphones"; tone: string }[] = [
  { key: "젠슨 황", icon: "chip", tone: "c1",
    name: { ko: "젠슨 황", en: "Jensen Huang", ja: "ジェンスン・フアン", zh: "黄仁勋" },
    kind: { ko: "테크 CEO", en: "Tech CEO", ja: "テックCEO", zh: "科技CEO" } },
  { key: "흑백요리사", icon: "chef", tone: "c2",
    name: { ko: "흑백요리사", en: "Culinary Class Wars", ja: "白と黒のスプーン", zh: "黑白厨师" },
    kind: { ko: "넷플릭스 예능", en: "Netflix show", ja: "Netflix番組", zh: "Netflix节目" } },
  { key: "BTS", icon: "mic", tone: "c3",
    name: { ko: "BTS", en: "BTS", ja: "BTS", zh: "BTS" }, kind: { ko: "K-팝", en: "K-pop", ja: "K-POP", zh: "K-pop" } },
  { key: "정국", icon: "star", tone: "c4",
    name: { ko: "정국", en: "Jungkook", ja: "ジョングク", zh: "田柾国" }, kind: { ko: "BTS", en: "BTS", ja: "BTS", zh: "BTS" } },
  { key: "지민", icon: "note", tone: "c5",
    name: { ko: "지민", en: "Jimin", ja: "ジミン", zh: "朴智旻" }, kind: { ko: "BTS", en: "BTS", ja: "BTS", zh: "BTS" } },
  { key: "RM", icon: "headphones", tone: "c6",
    name: { ko: "RM", en: "RM", ja: "RM", zh: "RM" }, kind: { ko: "BTS", en: "BTS", ja: "BTS", zh: "BTS" } },
];
// Members that aren't topic cards but appear in birthday-cafe events.
const EXTRA: Record<string, L4> = {
  진: { ko: "진", en: "Jin", ja: "ジン", zh: "金硕珍" }, 뷔: { ko: "뷔", en: "V", ja: "V", zh: "金泰亨" },
  슈가: { ko: "슈가", en: "SUGA", ja: "SUGA", zh: "闵玧其" }, 제이홉: { ko: "제이홉", en: "j-hope", ja: "J-HOPE", zh: "郑号锡" },
  "코즈메 켄마": { ko: "코즈메 켄마", en: "Kozume Kenma", ja: "孤爪研磨", zh: "孤爪研磨" },
};
export const subjectName = (key: string, lang: Lang) => SUBJECTS.find((s) => s.key === key)?.name[lang] ?? EXTRA[key]?.[lang] ?? key;


export const isSubjectKey = (v: unknown): v is string => typeof v === "string" && SUBJECTS.some((s) => s.key === v);
