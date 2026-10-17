"use client";
// Full-screen cards a traveler shows to a taxi driver or restaurant staff: Korean in large type,
// the traveler's language underneath. No Korean needed on either side.
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { PHRASES } from "@/lib/i18n-plan";
import { romanize } from "@/lib/romanize";
import { CloseIcon } from "./Icons";

export type HelpPlace = {
  id: string; name: string; location: { lat: number; lng: number }; address?: { road?: string };
  nearestStation?: { station: string; walkMin: number } | null; menu?: { name: string; price?: string | null }[];
};

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="help-full" role="dialog" aria-label={title}>
      <header className="help-top"><span>{title}</span><button aria-label="close" onClick={onClose}><CloseIcon size={22} /></button></header>
      <div className="help-body">{children}</div>
    </div>
  );
}

export function TaxiCard({ place, onClose }: { place: HelpPlace; onClose: () => void }) {
  const { t } = useT();
  const [msg, setMsg] = useState("");
  const { lat, lng } = place.location;
  const road = place.address?.road ?? "";
  const links = [
    { label: "Naver Map", href: `https://map.naver.com/p/search/${encodeURIComponent(`${place.name} ${road}`.trim())}` },
    { label: "Kakao Map", href: `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${lat},${lng}` },
    { label: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` },
  ];
  async function copy() {
    try { await navigator.clipboard.writeText(`${place.name} ${road}`); setMsg(t("copied")); setTimeout(() => setMsg(""), 1500); } catch {}
  }
  return (
    <Shell title={t("taxiTitle")} onClose={onClose}>
      <p className="help-say">여기로 가주세요<small>{t("taxiSay")}</small></p>
      <p className="help-big">{place.name}</p>
      <p className="help-roman">{romanize(place.name)}</p>
      {road && <p className="help-addr">{road}</p>}
      {place.nearestStation && <p className="muted">{place.nearestStation.station}역 · {t("walk", { n: place.nearestStation.walkMin })}</p>}
      <div className="help-links">
        {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}
        <button onClick={copy}>{msg || t("copyAddr")}</button>
      </div>
    </Shell>
  );
}

export function OrderCard({ place, party, onClose }: { place: HelpPlace; party: number; onClose: () => void }) {
  const { t, lang } = useT();
  const [pick, setPick] = useState<string | null>(null);
  const menu = (place.menu ?? []).filter((m) => m.name).slice(0, 12);
  const fill = (s: string) => s.replace("{n}", String(party));
  return (
    <Shell title={t("orderTitle")} onClose={onClose}>
      {pick ? (
        <button className="help-pick" onClick={() => setPick(null)}>
          <span className="help-big">{pick}</span>
          <span className="help-say">이거 주세요<small>{PHRASES[0].t[lang]}</small></span>
        </button>
      ) : (
        <>
          <p className="help-place">{place.name}</p>
          {menu.length > 0 && (
            <>
              <h3>{t("orderMenu")} <span className="muted small">{t("orderPick")}</span></h3>
              <div className="help-menu">
                {menu.map((m) => (
                  <button key={m.name} onClick={() => setPick(m.name)}>
                    <b>{m.name}</b><span className="muted small">{romanize(m.name.replace(/\[.*?\]\s*/, ""))}{m.price ? ` · ${m.price}` : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <h3>{t("orderPhrases")}</h3>
          <div className="help-menu">
            {PHRASES.map((p) => (
              <button key={p.ko} onClick={() => setPick(fill(p.ko))}><b>{fill(p.ko)}</b>{lang !== "ko" && <span className="muted small">{fill(p.t[lang])}</span>}</button>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
