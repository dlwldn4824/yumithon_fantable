// Venue category labels (HeyYumi gives Korean labels like "육류,고기요리") in each UI language.
import type { Lang } from "./i18n";

type T = [string, string, string]; // en, ja, zh
const MAP: Record<string, T> = {
  한식: ["Korean", "韓国料理", "韩餐"], 육류: ["Meat", "肉料理", "肉类"], 고기요리: ["BBQ", "焼肉", "烤肉"],
  돼지고기구이: ["Pork BBQ", "豚焼肉", "烤猪肉"], 소고기구이: ["Beef BBQ", "牛焼肉", "烤牛肉"], 냉면: ["Naengmyeon", "冷麺", "冷面"],
  카페: ["Cafe", "カフェ", "咖啡厅"], 디저트: ["Dessert", "デザート", "甜品"], 치킨: ["Chicken", "チキン", "炸鸡"], 닭강정: ["Sweet fried chicken", "タッカンジョン", "甜辣鸡块"],
  요리주점: ["Gastropub", "居酒屋", "小酒馆"], 양식: ["Western", "洋食", "西餐"], 일식당: ["Japanese", "和食", "日料"], 중식당: ["Chinese", "中華", "中餐"],
  베이커리: ["Bakery", "ベーカリー", "面包店"], 순대: ["Sundae", "スンデ", "米肠"], 순댓국: ["Sundae soup", "スンデクク", "米肠汤"], 백숙: ["Baeksuk", "ペクスク", "白切鸡"],
  삼계탕: ["Samgyetang", "参鶏湯", "参鸡汤"], 퓨전음식: ["Fusion", "フュージョン", "融合菜"], 차: ["Tea", "お茶", "茶"], 맥주: ["Beer", "ビール", "啤酒"],
  호프: ["Pub", "ビアホール", "啤酒屋"], 칼국수: ["Kalguksu", "カルグクス", "刀切面"], 만두: ["Dumplings", "餃子", "饺子"], 생선회: ["Sashimi", "刺身", "生鱼片"],
  해장국: ["Haejang soup", "ヘジャンクク", "解酒汤"], 아시아음식: ["Asian", "アジア料理", "亚洲菜"], 베트남음식: ["Vietnamese", "ベトナム料理", "越南菜"],
  김밥: ["Gimbap", "キンパ", "紫菜包饭"], 분식: ["Street food", "粉食", "小吃"], 국밥: ["Gukbap", "クッパ", "汤饭"], "바(BAR)": ["Bar", "バー", "酒吧"],
  와인: ["Wine", "ワイン", "葡萄酒"], 이자카야: ["Izakaya", "居酒屋", "居酒屋"], 브런치카페: ["Brunch cafe", "ブランチカフェ", "早午餐咖啡"], 케이크전문: ["Cake shop", "ケーキ店", "蛋糕店"],
  아이스크림: ["Ice cream", "アイス", "冰淇淋"], 공방: ["Workshop", "工房", "工坊"], 테마카페: ["Theme cafe", "テーマカフェ", "主题咖啡"], 과일: ["Fruit", "フルーツ", "水果"],
  주스전문점: ["Juice bar", "ジュース店", "果汁店"], 한정식: ["Korean course", "韓定食", "韩定食"], 생선구이: ["Grilled fish", "焼き魚", "烤鱼"], 닭갈비: ["Dakgalbi", "タッカルビ", "辣炒鸡排"],
  족발: ["Jokbal", "チョッパル", "猪蹄"], 곱창: ["Gopchang", "コプチャン", "烤肠"], 혼술바: ["Solo bar", "一人飲みバー", "独酌酒吧"], 장어: ["Eel", "うなぎ", "鳗鱼"],
};
const IDX: Record<Exclude<Lang, "ko">, number> = { en: 0, ja: 1, zh: 2 };

export function category(label: string | undefined, lang: Lang) {
  if (!label || lang === "ko") return label ?? "";
  const whole = MAP[label];
  if (whole) return whole[IDX[lang]];
  return label.split(",").map((p) => MAP[p.trim()]?.[IDX[lang]] ?? p.trim()).join(" · ");
}
