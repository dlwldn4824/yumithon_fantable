"use client";
// A meal party page, opened from the invite a fan posts on X. Friends join with a nickname only;
// when the goal size is reached the party books the table through Yumi by itself.
import { use, useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import { xInviteUrl } from "@/components/MeetSheet";
import { TaxiCard, type HelpPlace } from "@/components/HelpCards";
import { CheckIcon, NfcIcon, ShareIcon, ShieldIcon, TaxiIcon } from "@/components/Icons";
import { useT, LangSwitch } from "@/lib/i18n";
import { PlaceName, useCat } from "@/lib/placeName";
import { errKey } from "@/lib/useMe";

type Meet = {
  id: string; hostNick: string; anchorName: string; date: string; time: string; goal: number; intro: string; status: "open" | "requested" | "booked" | "failed";
  place: HelpPlace & { categoryLabel?: string; image?: string | null; yumiReservable: boolean }; members: { nick: string; lang: string }[];
  isHost: boolean; joined: boolean;
};
const FLAG: Record<string, string> = { ko: "🇰🇷", en: "🌎", ja: "🇯🇵", zh: "🇨🇳" };

export default function MeetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useT();
  const cat = useCat();
  const [m, setM] = useState<Meet | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [missing, setMissing] = useState(false);
  const [err, setErr] = useState("");
  const [taxi, setTaxi] = useState(false);

  const load = () => fetch(`/api/meet?id=${id}`).then((r) => r.json()).then((d) => { if (d.meet) { setM(d.meet); setSignedIn(d.signedIn); } else setMissing(true); });
  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action: string, extra: object = {}) {
    setErr("");
    const res = await fetch("/api/meet", { method: "POST", body: JSON.stringify({ action, id, lang, ...extra }) }).then((r) => r.json());
    if (res.error) setErr(t(errKey(res.error)));
    load();
  }

  if (missing) return <div className="shell"><header className="topnav"><span className="logo">{t("meetTitle")}</span><LangSwitch /></header><p className="muted pad">—</p><TabBar active="buddy" /></div>;
  if (!m) return <div className="shell"><p className="muted pad">{t("loading")}</p></div>;

  const n = m.members.length;
  return (
    <div className="shell">
      <header className="topnav"><span className="logo">{t("meetTitle")}</span><LangSwitch /></header>

      <section className="meet-hero">
        {m.place.image && <img src={m.place.image} alt="" referrerPolicy="no-referrer" />}
        <span className="pill">{m.anchorName}</span>
        <PlaceName name={m.place.name} as="h1" />
        <p className="muted">{cat(m.place.categoryLabel)} · {m.date} {m.time}</p>
        <div className="meet-intro"><span className="avatar-dot">{m.hostNick.slice(0, 1).toUpperCase()}</span><div><b>{m.hostNick} · {t("meetHost")}</b><p>{m.intro}</p></div></div>
      </section>

      <section className="sec">
        <h2>{t("meetSeats", { n, m: m.goal })} <span className="muted">{m.status === "open" ? t("meetLeft", { n: m.goal - n }) : ""}</span></h2>
        <div className="meet-bar"><span style={{ width: `${Math.min(100, (n / m.goal) * 100)}%` }} /></div>
        <div className="meet-seats">
          {Array.from({ length: m.goal }).map((_, i) => {
            const p = m.members[i];
            return <span key={i} className={`seat ${p ? "on" : ""}`}>{p ? <>{FLAG[p.lang] ?? "🌎"} {p.nick}{i === 0 && <small> · {t("meetHost")}</small>}</> : "—"}</span>;
          })}
        </div>
      </section>

      <section className="block">
        {m.status === "booked" ? (
          <p className="green"><CheckIcon size={16} /> {t("meetBooked")}</p>
        ) : m.status === "requested" ? (
          <p><span className="dot-live" /> {t("meetRequested")}</p>
        ) : m.status === "failed" ? (
          <p className="err">{t("meetFailed")}</p>
        ) : !signedIn ? (
          <a href={`/me?next=${encodeURIComponent(`/meet/${id}`)}`}><button className="primary wide big">{t("meetLogin")}</button></a>
        ) : m.isHost ? (
          <>
            <p className="muted small center">{t("meetAuto", { n: m.goal })}</p>
            {n >= 2 && <button className="ghost wide" onClick={() => act("book_now")}>{t("meetBookNow", { n })}</button>}
          </>
        ) : m.joined ? (
          <>
            <p className="muted small center">{t("meetAuto", { n: m.goal })}</p>
            <button className="ghost wide" onClick={() => act("leave")}>{t("meetLeave")}</button>
          </>
        ) : (
          <button className="primary wide big" onClick={() => act("join")}>{t("meetJoin")}</button>
        )}
        {m.status === "open" && n < m.goal && (
          <a href={xInviteUrl(t, { id: m.id, intro: m.intro, placeName: m.place.name, anchorName: m.anchorName, date: m.date, time: m.time, left: m.goal - n })} target="_blank" rel="noopener noreferrer">
            <button className="primary wide"><ShareIcon size={16} /> {t("meetShare")}</button>
          </a>
        )}
        {err && <p className="err">{err}</p>}
        <button className="ghost wide" onClick={() => setTaxi(true)}><TaxiIcon size={16} /> {t("taxiBtn")}</button>
        <p className="muted small"><NfcIcon size={14} /> {t("meetTag")}</p>
        <p className="muted small"><ShieldIcon size={14} /> {t("meetSafe")}</p>
        {!m.isHost && <button className="link" onClick={() => act("report")}>{t("report")}</button>}
      </section>

      {taxi && <TaxiCard place={m.place} onClose={() => setTaxi(false)} />}
      <TabBar active="buddy" />
    </div>
  );
}
