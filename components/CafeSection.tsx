"use client";
// Birthday cafes (생카): upcoming idol birthdays + fan-registered events read from X posts.
// HeyYumi has no birthday-cafe data, so fans add events by pasting the X announcement link.
import { useEffect, useState } from "react";
import type { Place } from "./BookSheet";
import { useT, LOCALE } from "@/lib/i18n";
import { subjectName } from "@/lib/subjects";
import { BIRTHDAYS, dday } from "@/lib/birthdays";
import { PlaceName } from "@/lib/placeName";
import { CakeIcon, CupIcon } from "./Icons";

export type FanEvent = {
  id: string; kind?: "event" | "venue"; idol: string | null; venue: string | null; placeId?: string | null; place?: string | null; yumiReservable?: boolean;
  lat?: number; lng?: number; road?: string | null; dates: string[]; xUrl: string; author: string; text: string; at: string;
};

export default function CafeSection({ onBook, onEvents }: { onBook: (p: Place) => void; onEvents: (e: FanEvent[]) => void }) {
  const { t, lang } = useT();
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState<Record<string, string>>({});

  const load = () => fetch("/api/events").then((r) => r.json()).then((d) => { setEvents(d.events ?? []); onEvents(d.events ?? []); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/events", { method: "POST", body: JSON.stringify({ url }) }).then((r) => r.json());
    setBusy(false);
    setMsg(res.event ? t("cafeRegistered") : ["login_required", "rate_limited", "blocked_content"].includes(res.error) ? t(`err_${res.error}`) : t("cafeFail"));
    setTimeout(() => setMsg(""), 2500);
    if (res.event) { setUrl(""); load(); }
  }

  async function askWait(ev: FanEvent) {
    if (!ev.placeId) return;
    setLive((l) => ({ ...l, [ev.id]: t("asking") }));
    const first = await fetch("/api/live", { method: "POST", body: JSON.stringify({ placeId: ev.placeId, kind: "wait", topic: "웨이팅" }) }).then((r) => r.json());
    if (first.error || first.blocked) {
      setLive((l) => ({ ...l, [ev.id]: first.blocked ? t("closedNow") : t("liveNA") }));
      return;
    }
    let s = first;
    for (let i = 0; i < 15 && !s.settled; i++) s = await fetch(`/api/live?id=${first.queryId}`).then((r) => r.json());
    setLive((l) => ({ ...l, [ev.id]: `${t(`lv_${s.status}`)}${s.note ? ` · ${s.note}` : ""}` }));
  }

  const bdays = BIRTHDAYS.map((b) => ({ ...b, dd: dday(b.m, b.d) })).sort((a, b) => a.dd - b.dd);

  return (
    <>
      <section className="sec">
        <h2>{t("bdayTitle")}</h2>
        <div className="bdays">
          {bdays.map((b) => (
            <div key={b.key} className={`bday ${b.dd <= 0 ? "bday-on" : ""}`}>
              <span className="bday-d">{b.dd === 0 ? t("bdayToday") : b.dd < 0 ? t("bdayWeek") : `D-${b.dd}`}</span>
              <b>{subjectName(b.key, lang)}</b>
              <span className="muted small">{new Date(2000, b.m - 1, b.d).toLocaleDateString(LOCALE[lang], { month: "short", day: "numeric" })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2>{t("cafeTitle")} <span className="muted">{t("cafeSub")}</span></h2>
        <form className="cafe-reg" onSubmit={register}>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("cafePh")} aria-label={t("cafePh")} />
          <button className="primary" disabled={busy || !url.trim()}>{busy ? "…" : t("cafeReg")}</button>
        </form>
        {msg && <p className="pad small">{msg}</p>}
        {events.filter((e) => e.kind !== "venue").length === 0 && <p className="muted pad">{t("cafeEmpty")}</p>}
        <div className="list">
          {events.filter((e) => e.kind !== "venue").map((ev) => (
            <article className="event" key={ev.id}>
              <div className="event-top">
                <span className="pill pill-icon"><CakeIcon size={14} /> {ev.idol ? subjectName(ev.idol, lang) : "K-pop"}</span>
                {ev.dates.length > 0 && <span className="muted small">{ev.dates.join(" · ")}</span>}
              </div>
              {ev.place ? <PlaceName name={ev.place} className="event-name" /> : <b className="event-name">{ev.venue ?? "—"}</b>}
              <p className="event-text">{ev.text}</p>
              <div className="event-actions">
                <a className="src" href={ev.xUrl} target="_blank" rel="noreferrer">{ev.xUrl.includes("/status/") ? t("cafeSource") : t("source")} · {ev.xUrl.includes("x.com") ? "@" : ""}{ev.author} ↗</a>
                {!ev.placeId && <span className="pill">{t("cafeNotOnYumi")}</span>}
              </div>
              {ev.placeId && (
                <div className="row">
                  <button className="ghost" onClick={() => askWait(ev)}>{t("askWait")}</button>
                  {ev.yumiReservable && (
                    <button className="primary" onClick={() => onBook({ id: ev.placeId!, name: ev.place!, address: { road: ev.road ?? undefined }, location: { lat: ev.lat ?? 0, lng: ev.lng ?? 0 }, yumiReservable: true })}>
                      {t("book")}
                    </button>
                  )}
                </div>
              )}
              {live[ev.id] && <div className="live">{live[ev.id]}</div>}
            </article>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2>{t("cafeVenues")} <span className="muted">{t("cafeVenuesSub")}</span></h2>
        <div className="list">
          {events.filter((e) => e.kind === "venue").map((v) => (
            <div className="row-item" key={v.id}>
              <span className="thumb"><CupIcon size={26} /></span>
              <div className="row-body">
                <PlaceName name={v.place ?? v.venue ?? ""} />
                <div className="muted small">{v.text}</div>
                <a className="src" style={{ margin: 0 }} href={v.xUrl} target="_blank" rel="noreferrer">@{v.author} ↗</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
