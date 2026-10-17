"use client";
// 같이 밥 먹기: a fan picks a Yumi-bookable restaurant near the concert venue or birthday cafe, says how
// many people make the table and introduces themself; the invite link goes on X and the party books itself when full.
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { ANCHORS } from "@/lib/anchors";
import { PlaceName, useCat } from "@/lib/placeName";
import { useMe, errKey } from "@/lib/useMe";
import { subjectName } from "@/lib/subjects";
import type { FanEvent } from "./CafeSection";
import { CheckIcon, CloseIcon, ShareIcon } from "./Icons";

type Planned = {
  id: string; name: string; categoryLabel?: string; location: { lat: number; lng: number }; address?: { road?: string };
  distanceM?: number; yumiReservable: boolean; image?: string | null; nearestStation?: { station: string; walkMin: number } | null;
  menu?: { name: string; price?: string | null }[];
};
type MeetRow = { id: string; time: string; goal: number; intro: string; status: string; place: { name: string }; members: { nick: string }[]; hostNick: string };
type Anchor = { key: string; name: string; lat?: number; lng?: number; kind: "concert" | "area" | "cafe" };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

/** X post intent for a party invite: the host's intro, where and when, and seats left. */
export function xInviteUrl(t: (k: string, v?: Record<string, string | number>) => string, m: { id: string; intro: string; placeName: string; anchorName: string; date: string; time: string; left: number }) {
  const text = t("meetInvite", { intro: m.intro, place: m.placeName, anchor: m.anchorName, when: `${m.date.slice(5).replace("-", "/")} ${m.time}`, n: m.left });
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${location.origin}/meet/${m.id}`)}&hashtags=FanTable`;
}

export default function MeetSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const cat = useCat();
  const { me } = useMe();
  const [cafes, setCafes] = useState<Anchor[]>([]);
  const [anchor, setAnchor] = useState("gocheok");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("21:30");
  const [goal, setGoal] = useState(4);
  const [places, setPlaces] = useState<Planned[] | null>(null);
  const [pick, setPick] = useState<Planned | null>(null);
  const [intro, setIntro] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState<string | null>(null);
  const [others, setOthers] = useState<MeetRow[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => setCafes(
      ((d.events ?? []) as FanEvent[]).filter((e) => e.kind !== "venue" && e.lat != null && e.lng != null).map((e) => ({
        key: `cafe:${e.id}`, kind: "cafe" as const, lat: e.lat, lng: e.lng,
        name: `${e.idol ? subjectName(e.idol, lang) + " · " : ""}${e.place ?? e.venue ?? ""}`,
      })),
    ));
  }, [lang]);

  const fixed: Anchor[] = ANCHORS.filter((a) => a.kind === "concert").map((a) => ({ key: a.key, name: a.name[lang], kind: "concert" }));
  const all = [...fixed, ...cafes];
  const a = all.find((x) => x.key === anchor) ?? fixed[0];

  useEffect(() => {
    fetch(`/api/meet?anchor=${encodeURIComponent(anchor)}&date=${date}`).then((r) => r.json()).then((d) => setOthers(d.meets ?? []));
  }, [anchor, date]);

  // Restaurants come first: open at that time near the venue, bookable with Yumi.
  useEffect(() => {
    if (anchor.startsWith("cafe:") && !a.lat) return;
    setPlaces(null); setPick(null);
    let gone = false;
    const timer = setTimeout(async () => {
      const body = a.kind === "cafe" ? { lat: a.lat, lng: a.lng } : { anchor };
      const r = await fetch("/api/plan", { method: "POST", body: JSON.stringify({ ...body, date, time, party: 4 }) }).then((x) => x.json()).catch(() => ({}));
      if (!gone) setPlaces(r.bookable ?? []);
    }, 300);
    return () => { gone = true; clearTimeout(timer); };
  }, [anchor, date, time, a.lat]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    if (!pick) return;
    setBusy(true); setErr("");
    const { id, name, categoryLabel, location, address, image, yumiReservable, nearestStation, menu } = pick;
    const res = await fetch("/api/meet", {
      method: "POST",
      body: JSON.stringify({ action: "create", lang, anchor, anchorName: a.name, date, time, goal, intro, contact, consent,
        place: { id, name, categoryLabel, location, address, image: image ?? null, yumiReservable, nearestStation: nearestStation ?? null, menu } }),
    }).then((x) => x.json());
    setBusy(false);
    if (res.error) return setErr(t(errKey(res.error)));
    setMade(res.id);
  }

  async function join(id: string) {
    const res = await fetch("/api/meet", { method: "POST", body: JSON.stringify({ action: "join", id, lang }) }).then((x) => x.json());
    if (res.error) return setErr(t(errKey(res.error)));
    location.href = `/meet/${id}`;
  }

  const link = made ? `${location.origin}/meet/${made}` : "";
  const ready = pick && intro.trim() && contact.name.trim() && contact.phone.trim() && consent;

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <div className="sheet-head">
          <div><h2>{t("meetTitle")}</h2><p className="muted small">{t("meetSub")}</p></div>
          <button className="icon" onClick={onClose} aria-label="Close"><CloseIcon size={18} /></button>
        </div>

        {made ? (
          <div className="block meet-made">
            <p className="green"><CheckIcon size={16} /> {t("meetCreated")}</p>
            <PlaceName name={pick!.name} as="h3" />
            <p className="muted small">{a.name} · {date} {time} · {t("meetAuto", { n: goal })}</p>
            <p className="meet-title">“{intro}”</p>
            <div className="help-links">
              <a href={xInviteUrl(t, { id: made, intro, placeName: pick!.name, anchorName: a.name, date, time, left: goal - 1 })} target="_blank" rel="noopener noreferrer"><ShareIcon size={14} /> {t("meetShare")}</a>
              <button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch {} }}>{copied ? t("copied") : t("meetCopy")}</button>
            </div>
            <a href={`/meet/${made}`}><button className="primary wide big">{t("meetOpen")}</button></a>
          </div>
        ) : (
          <div className="plan-form" style={{ padding: 0 }}>
            <div className="plan-row">
              <label className="h">{t("meetStep1")} <span className="muted small">{t("concerts")}</span></label>
              <div className="plan-chips">{fixed.map((x) => <button type="button" key={x.key} className={anchor === x.key ? "on" : ""} onClick={() => setAnchor(x.key)}>{x.name}</button>)}</div>
              {cafes.length > 0 && <>
                <label className="h small muted">{t("meetCafes")}</label>
                <div className="plan-chips">{cafes.map((x) => <button type="button" key={x.key} className={anchor === x.key ? "on" : ""} onClick={() => setAnchor(x.key)}>{x.name}</button>)}</div>
              </>}
              <div className="plan-when">
                <input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} aria-label={t("meetWhen")} />
                <input type="time" value={time} step={1800} onChange={(e) => setTime(e.target.value)} aria-label={t("meetWhen")} />
              </div>
            </div>

            {others.length > 0 && (
              <div className="plan-row">
                <label className="h">{t("meetOthers")}</label>
                {others.map((m) => (
                  <div className="meet-row" key={m.id}>
                    <div><PlaceName name={m.place.name} /><span className="muted small">{m.time} · {m.hostNick} · {t("meetSeats", { n: m.members.length, m: m.goal })}</span>{m.intro && <span className="small">“{m.intro}”</span>}</div>
                    {m.status === "open" && m.members.length < m.goal
                      ? <button className="primary" onClick={() => join(m.id)}>{t("meetJoin")}</button>
                      : <span className="pill">{m.status === "booked" ? t("confirmed") : t("meetFull")}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="plan-row">
              <label className="h">{t("meetStep2")}</label>
              {places === null ? <p className="muted small">{t("meetLoading")}</p>
                : places.length === 0 ? <p className="plan-note" style={{ margin: 0 }}>{t("meetNone")}</p>
                : places.map((p) => (
                  <button type="button" key={p.id} className={`meet-pick ${pick?.id === p.id ? "on" : ""}`} onClick={() => setPick(p)}>
                    {p.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" /> : <span className="ph" />}
                    <span className="meta"><PlaceName name={p.name} /><span className="muted small">{cat(p.categoryLabel)} · {p.distanceM != null ? `${(p.distanceM / 1000).toFixed(1)}km` : ""}</span></span>
                    {pick?.id === p.id && <CheckIcon size={18} />}
                  </button>
                ))}
            </div>

            {pick && <>
              <div className="plan-row">
                <label className="h">{t("meetStep3")}</label>
                <div className="seg">{[2, 3, 4, 5, 6, 8].map((n) => <button type="button" key={n} className={goal === n ? "on" : ""} onClick={() => setGoal(n)}>{n}</button>)}</div>
                <p className="muted small">{t("meetAuto", { n: goal })}</p>
              </div>
              <div className="plan-row">
                <label className="h">{t("meetStep4")}</label>
                <textarea rows={2} maxLength={100} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={t("meetIntroPh")} />
              </div>
              {me === null ? (
                <a href="/me?next=/buddy"><button className="primary wide big">{t("meetLogin")}</button></a>
              ) : (
                <div className="plan-row">
                  <label className="h">{t("meetBooker")}</label>
                  <input placeholder={t("name")} value={contact.name} maxLength={40} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  <input placeholder={t("phone")} value={contact.phone} inputMode="tel" onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  <input type="email" placeholder={t("email")} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  <p className="muted small">{t("meetContactNote")}</p>
                  <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {t("meetConsent")}</label>
                  <button className="primary wide big" disabled={busy || !ready} onClick={create}>{t("meetCreate")}</button>
                </div>
              )}
            </>}
            {err && <p className="err">{err}</p>}
            <p className="muted small center">{t("meetSafe")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
