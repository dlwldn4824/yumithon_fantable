"use client";
import { useEffect, useRef, useState } from "react";
import { PlaceName, useCat, useDistrict } from "@/lib/placeName";
import BookSheet, { type Place } from "@/components/BookSheet";
import MeetSheet from "@/components/MeetSheet";
import TabBar from "@/components/TabBar";
import { CheckIcon, ArrowIcon, StarIcon, CupIcon, CakeIcon, FoodIcon, UtensilsIcon } from "@/components/Icons";
import { Sparkle } from "@/components/Doodles";
import { useT, LangSwitch, LOCALE } from "@/lib/i18n";
import { subjectName } from "@/lib/subjects";
import { useSandbox } from "@/lib/useSandbox";

type P = Place & { image?: string | null };
type Card =
  | { type: "famous"; result: { place: P; image: string | null; story: string | null; storySubject: string; storyIsShow: boolean; alternatives: P[]; source: { publisher?: string } | null } }
  | { type: "place"; place: P; when?: { date: string; time: string; party: number } }
  | { type: "live"; place: P; answer: { status: string; note?: string | null; verifiedAt?: string | null } }
  | { type: "xpost"; post: { url: string; author: string; text: string; venue: string | null; dates: string[] }; match: P | null };
type Msg = { role: "user" | "assistant"; text: string; cards?: Card[] };


export default function Buddy() {
  const { t, lang } = useT();
  const cat = useCat();
  const district = useDistrict();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<Place | null>(null);
  const [when, setWhen] = useState<{ date: string; time: string; party: number } | undefined>();
  const [meet, setMeet] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sandbox = useSandbox();
  const [registered, setRegistered] = useState<Record<string, boolean>>({});
  async function registerEvent(url: string) {
    const res = await fetch("/api/events", { method: "POST", body: JSON.stringify({ url }) }).then((r) => r.json());
    if (res.event) setRegistered((r) => ({ ...r, [url]: true }));
    else if (res.error) alert(t(`err_${res.error}`));
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        body: JSON.stringify({ lang, history: next.map(({ role, text }) => ({ role, text })) }),
      }).then((r) => r.json());
      setMsgs([...next, { role: "assistant", text: res.reply ?? (res.error ? t(`err_${res.error}`) : "…"), cards: res.cards ?? [] }]);
    } finally {
      setBusy(false);
    }
  }

  const live = (s: string) => (t(`lv_${s}`) !== `lv_${s}` ? t(`lv_${s}`) : t(`st_${s}`));
  const asksNow = /지금|바로|now|今|现在/i.test(msgs[msgs.length - 1]?.text ?? "");

  return (
    <div className="shell chat-shell">
      <header className="topnav"><span className="logo">{t("buddyTitle")}</span><span className="logo-sub">{t("buddySub")}</span><LangSwitch /></header>

      <div className="chat">
        <div className="bubble bot">
          <span className="bot-face"><Sparkle size={20} /></span>
          <p>{t("buddyHi")}</p>
        </div>
        {msgs.length === 0 && (
          <div className="chips-col">
            {["chip1", "chip2", "chip3"].map((k) => (
              <button key={k} className="qchip" onClick={() => send(t(k))}>{t(k)} <ArrowIcon size={12} /></button>
            ))}
            <button className="qchip meet-chip" onClick={() => setMeet(true)}><UtensilsIcon size={14} /> {t("chip4")}</button>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i}>
            <div className={`bubble ${m.role === "user" ? "me" : "bot"}`}>
              {m.role === "assistant" && <span className="bot-face"><Sparkle size={20} /></span>}
              <p>{m.text}</p>
            </div>
            {m.cards && m.cards.length > 0 && (
              <div className="cards">
                {m.cards.map((c, j) => {
                  if (c.type === "famous") {
                    const r = c.result;
                    return (
                      <div className="ccard" key={j}>
                        <span className="cthumb">{r.image ? <img src={r.image} alt="" referrerPolicy="no-referrer" /> : <StarIcon size={22} />}</span>
                        <div className="cbody">
                          <span className="pill pill-icon"><StarIcon size={12} /> {subjectName(r.storySubject, lang)}</span>
                          <PlaceName name={r.place.name} />
                          <span className="muted small">{district(r.place.address?.road)} · {cat(r.place.categoryLabel)}</span>
                        </div>
                        {r.place.yumiReservable
                          ? <button className="primary" onClick={() => setBooking(r.place)}>{t("book")}</button>
                          : r.alternatives[0] && <button className="primary" onClick={() => setBooking(r.alternatives[0])}>{t("book")}</button>}
                      </div>
                    );
                  }
                  if (c.type === "place") return (
                    <div className="ccard" key={j}>
                      <span className="cthumb">{c.place.image ? <img src={c.place.image} alt="" /> : <FoodIcon label={c.place.categoryLabel} size={22} />}</span>
                      <div className="cbody">
                        <span className="pill pill-ok">{t("partnerTag")}</span>
                        <PlaceName name={c.place.name} />
                        <span className="muted small">{district(c.place.address?.road)} · {cat(c.place.categoryLabel)}</span>
                      </div>
                      <button className="primary" onClick={() => { setWhen(c.when); setBooking(c.place); }}>{t("book")}</button>
                    </div>
                  );
                  if (c.type === "live") {
                    const ok = ["available", "limited"].includes(c.answer.status);
                    return (
                      <div className={`ccard ${ok ? "live-ok" : "live-no"}`} key={j}>
                        <span className="cthumb">{c.place.image ? <img src={c.place.image} alt="" /> : <FoodIcon label={c.place.categoryLabel} size={22} />}</span>
                        <div className="cbody">
                          <span className={`pill ${ok ? "pill-ok" : ""}`}>{ok && <CheckIcon size={11} />} {live(c.answer.status)}</span>
                          <PlaceName name={c.place.name} />
                          <span className="muted small">
                            {c.answer.verifiedAt ? t("ownerChecked", { t: new Date(c.answer.verifiedAt).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit" }) }) : district(c.place.address?.road)}
                          </span>
                        </div>
                        {ok && <button className="primary" onClick={() => setBooking(c.place)}>{t("book")}</button>}
                      </div>
                    );
                  }
                  return (
                    <div className="xcard" key={j}>
                      <div className="muted small">{t("xRead")} · @{c.post.author}</div>
                      <p className="xtext">{c.post.text}</p>
                      <div className="small"><b>{t("xVenue")}</b> {c.post.venue ?? "—"} {c.post.dates.length > 0 && <> · <b>{t("xDates")}</b> {c.post.dates.join(", ")}</>}</div>
                      {c.match ? (
                        <div className="ccard" style={{ marginTop: 8 }}>
                          <span className="cthumb"><CupIcon size={22} /></span>
                          <div className="cbody">
                            <span className="pill pill-ok">{t("xFound")}</span>
                            <PlaceName name={c.match.name} />
                            <span className="muted small">{c.match.address?.road}</span>
                          </div>
                          {c.match.yumiReservable && <button className="primary" onClick={() => setBooking(c.match!)}>{t("book")}</button>}
                        </div>
                      ) : <span className="pill">{t("xNotFound")}</span>}
                      <button className="ghost wide" style={{ marginTop: 8 }} disabled={registered[c.post.url]} onClick={() => registerEvent(c.post.url)}>
                        {registered[c.post.url] ? <><CheckIcon size={14} /> {t("cafeRegistered")}</> : <><CakeIcon size={16} /> {t("registerEvent")}</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble bot"><span className="bot-face"><Sparkle size={20} /></span><p className="typing">{asksNow ? t("ownersAsking") : t("thinking")}</p></div>}
        <div ref={endRef} />
      </div>

      {msgs.length > 0 && <button className="meet-fab" onClick={() => setMeet(true)}><UtensilsIcon size={16} /> {t("chip4")}</button>}
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("buddyPh")} aria-label={t("buddyPh")} />
        <button className="primary" disabled={busy || !input.trim()} aria-label="Send"><ArrowIcon size={18} /></button>
      </form>

      <TabBar active="buddy" />
      {booking && <BookSheet place={booking} lang={lang} sandbox={sandbox} initial={when} onClose={() => { setBooking(null); setWhen(undefined); }} />}
      {meet && <MeetSheet onClose={() => setMeet(false)} />}
    </div>
  );
}
