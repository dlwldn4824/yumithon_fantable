"use client";
import { MapIcon, ChatIcon, RouteIcon, UserIcon } from "./Icons";
import { useT } from "@/lib/i18n";

export type Tab = "map" | "buddy" | "plan" | "me";

export default function TabBar({ active }: { active: Tab }) {
  const { t } = useT();
  const tabs = [
    { key: "map", href: "/", label: t("tabExplore"), Icon: MapIcon },
    { key: "buddy", href: "/buddy", label: t("tabBuddy"), Icon: ChatIcon },
    { key: "plan", href: "/plan", label: t("tabPlan"), Icon: RouteIcon },
    { key: "me", href: "/me", label: t("tabMe"), Icon: UserIcon },
  ] as const;
  return (
    <nav className="tabs">
      {tabs.map(({ key, href, label, Icon }) => (
        <a key={key} href={href} className={`tab ${active === key ? "tab-on" : ""}`}>
          <Icon size={22} />
          {label}
        </a>
      ))}
    </nav>
  );
}
