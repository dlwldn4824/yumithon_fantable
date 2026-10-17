"use client";
// Venue name for the current UI language: romanized for non-Korean readers, with the Hangul kept small
// underneath so a fan can show it to a taxi driver or match it on a map.
import { romanize, hasHangul } from "./romanize";
import { useT } from "./i18n";

export function PlaceName({ name, as: Tag = "b", className }: { name: string; as?: "b" | "span" | "h1" | "h2" | "h3"; className?: string }) {
  const { lang } = useT();
  if (lang === "ko" || !hasHangul(name)) return <Tag className={className}>{name}</Tag>;
  return (
    <Tag className={className}>
      {romanize(name)}
      <span className="ko-sub">{name}</span>
    </Tag>
  );
}

import { category } from "./category";

/** Category label translator for the current UI language. */
export function useCat() {
  const { lang } = useT();
  return (label?: string) => category(label, lang);
}

/** District ("중구") from a road address, romanized outside Korean mode ("Jung-gu"). */
export function useDistrict() {
  const { lang } = useT();
  return (road?: string) => {
    const gu = road?.split(" ")[1] ?? "";
    if (lang === "ko" || !hasHangul(gu)) return gu;
    return romanize(gu.replace(/(구|시|군)$/, "")) + ({ 구: "-gu", 시: "-si", 군: "-gun" }[gu.slice(-1)] ?? "");
  };
}
