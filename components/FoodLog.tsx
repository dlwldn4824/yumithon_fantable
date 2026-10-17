"use client";
import { useEffect, useState } from "react";
import { PlaceName } from "@/lib/placeName";
import { HeartIcon, ShareIcon, StarIcon } from "@/components/Icons";
import { useT, LangSwitch, LOCALE } from "@/lib/i18n";
import { subjectName } from "@/lib/subjects";
import { errKey } from "@/lib/useMe";

type Entry = { id: string; place: string; image?: string | null; note: string; subject?: string | null; lang: string; nickname: string; at: string; likes: number; liked?: boolean; mine?: boolean; demo?: boolean };

const FLAG: Record<string, string> = { ko: "🇰🇷", en: "🌎", ja: "🇯🇵", zh: "🇨🇳" };

// Fans’ food logs and my own; used inside My page (and /log for shared links).
export default function FoodLog({ embedded = false }: { embedded?: boolean }) {
  const { t, lang } = useT();
  const [view, setView] = useState<"mine" | "fans">("fans");
  const [logs, setLogs] = useState<Entry[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/logs").then((r) => r.json()).then((d) => setLogs(d.logs ?? []));
  }, []);

  const shown = view === "mine" ? logs.filter((l) => l.mine) : logs;
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  async function like(id: string) {
    const res = await fetch("/api/logs", { method: "POST", body: JSON.stringify({ like: id }) }).then((r) => r.json());
    if (res.error) return flash(t(errKey(res.error)));
    setLogs((ls) => ls.map((l) => (l.id === id ? { ...l, likes: res.likes, liked: true } : l)));
  }

  async function reportLog(id: string) {
    const res = await fetch("/api/report", { method: "POST", body: JSON.stringify({ type: "log", id }) }).then((r) => r.json());
    flash(res.error ? t(errKey(res.error)) : t("reported"));
  }

  async function share(e: Entry) {
    const text = `${e.place} — ${e.note}`;
    const url = `${location.origin}/log#${e.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Fan Table", text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setToast(t("copied")); setTimeout(() => setToast(""), 1800); }
    } catch {}
  }

  // Group entries by day for a travel-log timeline.
  const days = new Map<string, Entry[]>();
  for (const e of shown) {
    const d = new Date(e.at).toLocaleDateString(LOCALE[lang], { month: "long", day: "numeric", weekday: "short" });
    days.set(d, [...(days.get(d) ?? []), e]);
  }

  return (
    <div className={embedded ? "" : "shell"}>
      {!embedded && <header className="topnav"><span className="logo">{t("logTitle")}</span><LangSwitch /></header>}

      <div className="filters" style={{ paddingTop: 14 }}>
        <button className={`fpill ${view === "mine" ? "fpill-on" : ""}`} onClick={() => setView("mine")}>{t("logMine")}</button>
        <button className={`fpill ${view === "fans" ? "fpill-on" : ""}`} onClick={() => setView("fans")}>{t("logFans")}</button>
      </div>

      {shown.length === 0 && <p className="muted pad">{t("logEmpty")}</p>}

      <div className="timeline">
        {[...days.entries()].map(([day, entries]) => (
          <section key={day}>
            <div className="tl-day">{day}</div>
            {entries.map((e) => (
              <article className="logcard" key={e.id} id={e.id}>
                {e.image && <img className="log-img" src={e.image} alt="" referrerPolicy="no-referrer" />}
                <div className="log-body">
                  <div className="muted small">
                    {e.demo && <span className="pill demo">{t("demoTag")}</span>} {FLAG[e.lang] ?? "🌎"} {e.nickname.replace(/^예시 · /, "")} · {new Date(e.at).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit" })}
                    {e.subject && <> · <span className="pill pill-icon"><StarIcon size={12} /> {subjectName(e.subject, lang)}</span></>}
                  </div>
                  <PlaceName name={e.place} className="log-place" />
                  {e.note && <p className="log-note">“{e.note}”</p>}
                  <div className="log-actions">
                    <button onClick={() => like(e.id)}><span style={{ color: e.liked ? "#e5484d" : undefined, display: "inline-flex" }}><HeartIcon size={16} /></span> {e.likes > 0 ? e.likes : t("like")}</button>
                    <button onClick={() => share(e)}><ShareIcon size={16} /> {t("share")}</button>
                    {!e.mine && !e.demo && <button onClick={() => reportLog(e.id)} style={{ marginLeft: "auto" }}>{t("report")}</button>}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
