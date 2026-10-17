// Publicly known birthdays for the idols on the Explore topics (month, day).
export const BIRTHDAYS: { key: string; m: number; d: number }[] = [
  { key: "RM", m: 9, d: 12 }, { key: "진", m: 12, d: 4 }, { key: "슈가", m: 3, d: 9 }, { key: "제이홉", m: 2, d: 18 },
  { key: "지민", m: 10, d: 13 }, { key: "뷔", m: 12, d: 30 }, { key: "정국", m: 9, d: 1 },
];

/** Days until the next birthday in Korea time; negative (down to -7) means the birthday week just happened. */
export function dday(m: number, d: number, now = new Date()) {
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const today = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
  const thisYear = new Date(kst.getFullYear(), m - 1, d);
  const diff = Math.round((thisYear.getTime() - today.getTime()) / 86400000);
  if (diff >= -7) return diff;
  return Math.round((new Date(kst.getFullYear() + 1, m - 1, d).getTime() - today.getTime()) / 86400000);
}
