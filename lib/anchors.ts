// Where fans go on an event day: concert venues and birthday-cafe neighborhoods.
// Coordinates are approximate public locations; "area" anchors resolve through HeyYumi regions.
import type { Lang } from "./i18n";

export type Anchor = { key: string; kind: "concert" | "area"; name: Record<Lang, string>; lat?: number; lng?: number; region?: string };

export const ANCHORS: Anchor[] = [
  { key: "kspo", kind: "concert", lat: 37.5196, lng: 127.127, name: { ko: "KSPO돔 (올림픽공원)", en: "KSPO DOME", ja: "KSPOドーム", zh: "KSPO巨蛋" } },
  { key: "gocheok", kind: "concert", lat: 37.498239, lng: 126.866933, name: { ko: "고척스카이돔", en: "Gocheok Sky Dome", ja: "高尺スカイドーム", zh: "高尺巨蛋" } },
  { key: "goyang", kind: "concert", lat: 37.6772, lng: 126.7444, name: { ko: "고양종합운동장", en: "Goyang Stadium", ja: "高陽総合運動場", zh: "高阳综合运动场" } },
  { key: "inspire", kind: "concert", lat: 37.4645, lng: 126.387, name: { ko: "인스파이어 아레나", en: "Inspire Arena", ja: "インスパイアアリーナ", zh: "Inspire Arena" } },
  { key: "hybe", kind: "concert", lat: 37.5293, lng: 126.9647, name: { ko: "하이브 (용산)", en: "HYBE (Yongsan)", ja: "HYBE（龍山）", zh: "HYBE（龙山）" } },
  { key: "hongdae", kind: "area", region: "홍대", name: { ko: "홍대 (생카)", en: "Hongdae (bday cafes)", ja: "弘大（センイルカフェ）", zh: "弘大（生日咖啡）" } },
  { key: "seongsu", kind: "area", region: "성수동", name: { ko: "성수", en: "Seongsu", ja: "聖水", zh: "圣水" } },
  { key: "myeongdong", kind: "area", region: "명동", name: { ko: "명동", en: "Myeongdong", ja: "明洞", zh: "明洞" } },
  { key: "euljiro", kind: "area", region: "을지로", name: { ko: "을지로", en: "Euljiro", ja: "乙支路", zh: "乙支路" } },
];
