"use client";
import { useEffect, useMemo, useState } from "react";
import { PlaceName, useCat } from "@/lib/placeName";
import { saveBooking } from "@/lib/store";
import { CheckIcon, CloseIcon } from "@/components/Icons";
import { useT, LOCALE, type Lang } from "@/lib/i18n";
import { useMe, errKey } from "@/lib/useMe";

export type Place = {
  id: string; name: string; categoryLabel?: string; address?: { road?: string }; distanceM?: number;
  location: { lat: number; lng: number }; yumiReservable?: boolean;
  nearestStation?: { station: string; walkMin: number } | null;
  image?: string | null;
};

function dayOptions(lang: Lang, today: string, tomorrow: string) {
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const base = new Date();
  return [0, 1, 2, 3].map((n) => {
    const d = new Date(base.getTime() + n * 86400000);
    return { value: fmt(d), label: n === 0 ? today : n === 1 ? tomorrow : d.toLocaleDateString(LOCALE[lang], { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Seoul" }) };
  });
}
const TIMES = ["12:00", "18:00", "18:30", "19:00", "19:30"];
export default function BookSheet({ place, lang, sandbox, onClose, initial, onConfirmed }: { place: Place; lang: Lang; sandbox: boolean; onClose: () => void; initial?: { date?: string; time?: string; party?: number }; onConfirmed?: (reservationId: string) => void }) {
  const { t } = useT();
  const days = useMemo(() => {
    const d = dayOptions(lang, t("today"), t("tomorrow"));
    // A planned day further out (e.g. a concert next week) gets its own chip.
    if (initial?.date && !d.some((x) => x.value === initial.date))
      d.push({ value: initial.date, label: new Date(`${initial.date}T12:00:00+09:00`).toLocaleDateString(LOCALE[lang], { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Seoul" }) });
    return d;
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const times = initial?.time && !TIMES.includes(initial.time) ? [...TIMES, initial.time].sort() : TIMES;
  const [detail, setDetail] = useState<any>(null);
  const [live, setLive] = useState("");
  const [date, setDate] = useState(initial?.date ?? days[1].value);
  const [time, setTime] = useState(initial?.time ?? "18:30");
  const [party, setParty] = useState(initial?.party ?? 2);
  const [guest, setGuest] = useState({ name: "", phone: "", email: "", note: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "pending" | "confirmed" | "cancelled" | "expired" | "error">("idle");
  const [resId, setResId] = useState("");
  const [err, setErr] = useState("");
  const [consent, setConsent] = useState(false);
  const { me } = useMe();

  useEffect(() => {
    fetch(`/api/place/${place.id}?lang=${lang}`).then((r) => r.json()).then(setDetail);
  }, [place.id, lang]);

  async function ask(kind: "wait" | "seats") {
    setLive(t("asking"));
    const topic = kind === "wait" ? "웨이팅" : `${party}명 입장`;
    const res = await fetch("/api/live", { method: "POST", body: JSON.stringify({ placeId: place.id, kind, topic }) }).then((r) => r.json());
    if (res.error) return setLive(res.body?.code === "live_status_not_available" ? t("liveNA") : res.error);
    if (res.blocked === "closed_now") return setLive(t("closedNow"));
    let s = res;
    for (let i = 0; i < 15 && !s.settled; i++) s = await fetch(`/api/live?id=${res.queryId}`).then((r) => r.json());
    setLive(`${t(`lv_${s.status}`)}${s.verifiedAt ? ` · ${t("ownerChecked", { t: new Date(s.verifiedAt).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit" }) })}` : ""}`);
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setStatus("sending");
    const res = await fetch("/api/reserve", {
      method: "POST",
      body: JSON.stringify({
        placeId: place.id, placeName: place.name, lang, reservationTime: `${date}T${time}:00+09:00`, guestCount: party,
        guestName: guest.name, guestPhone: guest.phone, guestEmail: guest.email, note: guest.note, consent,
      }),
    }).then((r) => r.json());
    if (res.error) {
      setStatus("error");
      const known = ["login_required", "rate_limited", "invalid_input", "blocked_content"].includes(res.error);
      return setErr(known ? t(errKey(res.error)) : res.body?.code ?? res.error);
    }
    setResId(res.reservationId);
    setStatus("pending");
    let s = res;
    for (let i = 0; i < 15 && s.status === "pending"; i++) s = await fetch(`/api/reserve?id=${res.reservationId}`).then((r) => r.json());
    setStatus(s.status);
    if (s.status === "confirmed") onConfirmed?.(res.reservationId);
    if (s.status === "confirmed")
      saveBooking({ id: res.reservationId, placeId: place.id, place: place.name, image: place.image, date, time, party, at: new Date().toISOString() });
  }

  const p = detail?.place;
  const langs: string[] = p?.serviceAttributes?.foreign_languages ?? [];
  const pays: string[] = p?.serviceAttributes?.payment_methods ?? [];
  const PAY: Record<string, string> = { alipay: "Alipay", wechat_pay: "WeChat Pay", apple_pay: "Apple Pay", card: "Card", kakao_pay: "KakaoPay" };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <div className="card-head">
          <div>
            <PlaceName name={place.name} as="h2" />
            <div className="muted">{place.address?.road}</div>
          </div>
          <button className="icon" onClick={onClose} aria-label="Close"><CloseIcon size={18} /></button>
        </div>

        {status === "confirmed" ? (
          <div className="done">
            <div className="done-check"><CheckIcon size={32} /></div>
            <h3>{t("doneTitle")}</h3>
            <p className="muted">{t("doneSub", { n: party, date, time, email: guest.email })}</p>
            <p>{t("doneTag")}</p>
            <a href="/pass"><button className="primary wide">{t("seePass")}</button></a>
          </div>
        ) : (
          <>
            <section className="block">
              <div className="label">{t("check")}</div>
              {!detail ? <div className="muted">{t("loading")}</div> : (
                <>
                  {detail.summary && (lang === "ko" || !/[가-힣]/.test(detail.summary)) && <p className="summary">{detail.summary}</p>}
                  <div className="tags">
                    {langs.map((l) => <span key={l} className="pill pill-ok">{t("staffSpeak", { l: l.toUpperCase() })}</span>)}
                    {pays.filter((x) => PAY[x]).map((x) => <span key={x} className="pill">{PAY[x]}</span>)}
                  </div>
                  {detail.menu?.length > 0 && <div className="menu">{detail.menu.slice(0, 3).map((m: string) => <div key={m}>{m}</div>)}</div>}
                  <div className="row">
                    <button type="button" className="ghost" onClick={() => ask("wait")}>{t("askWait")}</button>
                    <button type="button" className="ghost" onClick={() => ask("seats")}>{t("askSeats", { n: party })}</button>
                  </div>
                  {live && <div className="live">{live}</div>}
                </>
              )}
            </section>

            {me === null ? (
              <div className="block">
                <div className="label">{t("bookTitle")}</div>
                <p>{t("loginToBook")}</p>
                <a href={`/me?next=${encodeURIComponent(typeof location !== "undefined" ? location.pathname : "/")}`}><button className="primary wide big">{t("goLogin")}</button></a>
              </div>
            ) : (
            <form className="block" onSubmit={book}>
              <div className="label">{t("bookTitle")}</div>
              <div className="seg">
                {days.map((d) => <button type="button" key={d.value} className={date === d.value ? "on" : ""} onClick={() => setDate(d.value)}>{d.label}</button>)}
              </div>
              <div className="seg">
                {times.map((tm) => <button type="button" key={tm} className={time === tm ? "on" : ""} onClick={() => setTime(tm)}>{tm}</button>)}
              </div>
              <div className="stepper">
                <span>{t("people")}</span>
                <button type="button" onClick={() => setParty(Math.max(1, party - 1))}>−</button>
                <b>{party}</b>
                <button type="button" onClick={() => setParty(party + 1)}>+</button>
              </div>
              <input required placeholder={t("name")} value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
              <div className="two">
                <input required placeholder={t("phone")} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
                <input required type="email" placeholder={t("email")} value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              </div>
              <input placeholder={t("note")} value={guest.note} onChange={(e) => setGuest({ ...guest, note: e.target.value })} />
              <label className="check small"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /> <span>{t("bookConsent")} (<a href="/privacy" target="_blank">{t("privacy")}</a>)</span></label>
              {sandbox && (
                <button type="button" className="link" onClick={() => setGuest({ name: "Emily Carter", phone: "+1 555 123 4567", email: "emily@example.com", note: "First time in Seoul — can’t wait!" })}>
                  {t("demoFill")}
                </button>
              )}
              {status === "pending" && <div className="live">{t("sent")}</div>}
              {status === "cancelled" && <p className="err">{t("cancelled")}</p>}
              {status === "expired" && <p className="err">{t("expired")}</p>}
              {err && <p className="err">{err}</p>}
              <button className="primary wide big" disabled={status === "sending" || status === "pending"}>
                {status === "pending" ? t("waiting") : status === "sending" ? t("sending") : t("request", { time, n: party })}
              </button>
              {sandbox && <div className="muted center">{t("sandbox")}</div>}
            </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
