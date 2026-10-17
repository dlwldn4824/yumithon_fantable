"use client";
// Event-day route: pick a concert venue or fan neighborhood, when you'll be free and how many,
// and see places open at that time — bookable partners first, then walk-ins with taxi/order cards.
import { useState } from "react";
import TabBar from "@/components/TabBar";
import BookSheet from "@/components/BookSheet";
import { TaxiCard, OrderCard, type HelpPlace } from "@/components/HelpCards";
import { TaxiIcon, UtensilsIcon } from "@/components/Icons";
import { useT, LangSwitch } from "@/lib/i18n";
import { ANCHORS } from "@/lib/anchors";
import { PlaceName, useCat } from "@/lib/placeName";
import { useSandbox } from "@/lib/useSandbox";

type Planned = HelpPlace & {
  categoryLabel?: string; distanceM?: number; yumiReservable: boolean; image?: string | null;
  attrs: { group: boolean; pay: string[]; langs: string[]; halal: boolean };
};
type Result = { at: string | null; bookable: Planned[]; walkIn: Planned[] };
type Filters = { foreigner: boolean; pay: string[]; halal: boolean; vegan: boolean; group: boolean };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const PAY_KEY: Record<string, string> = { apple_pay: "payApple", alipay: "payAli", wechat_pay: "payWechat", unionpay: "payUnion" };

export default function Plan() {
  const { t, lang } = useT();
  const cat = useCat();
  const sandbox = useSandbox();
  const [anchor, setAnchor] = useState("gocheok");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("21:30");
  const [party, setParty] = useState(4);
  const [f, setF] = useState<Filters>({ foreigner: false, pay: [], halal: false, vegan: false, group: false });
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [book, setBook] = useState<Planned | null>(null);
  const [taxi, setTaxi] = useState<Planned | null>(null);
  const [order, setOrder] = useState<Planned | null>(null);
  const [wanted, setWanted] = useState<string[]>([]);

  const a = ANCHORS.find((x) => x.key === anchor)!;
  const toggle = (k: "foreigner" | "halal" | "vegan" | "group") => setF({ ...f, [k]: !f[k] });
  const togglePay = () => setF({ ...f, pay: f.pay.length ? [] : ["apple_pay", "alipay", "wechat_pay"] });

  async function go() {
    setBusy(true); setErr(""); setRes(null);
    const r = await fetch("/api/plan", { method: "POST", body: JSON.stringify({ anchor, date, time, party, filters: f }) }).then((x) => x.json()).catch(() => ({ error: "x" }));
    setBusy(false);
    if (r.error) return setErr(t("planNone"));
    setRes(r);
  }

  async function want(p: Planned) {
    setWanted((w) => [...w, p.id]);
    await fetch("/api/owner", { method: "POST", body: JSON.stringify({ id: p.id, name: p.name, lang }) });
  }

  const dist = (m?: number) => (m == null ? "" : m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);
  const atLabel = res?.at ? `${res.at.slice(5, 10).replace("-", "/")} ${res.at.slice(11, 16)}` : "";

  const card = (p: Planned) => (
    <article className="plan-card" key={p.id}>
      {p.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" /> : <div className="ph" />}
      <div className="meta">
        <PlaceName name={p.name} />
        <span className="muted small">{cat(p.categoryLabel)} · {t("fromVenue", { p: a.name[lang].replace(/\s*\(.*\)/, ""), d: dist(p.distanceM) })}</span>
        <div className="plan-chips">
          {p.attrs.group && <span className="pill">{t("groupOk")}</span>}
          {p.attrs.halal && <span className="pill">{t("fHalal")}</span>}
          {p.attrs.pay.filter((x) => PAY_KEY[x]).map((x) => <span className="pill" key={x}>{t(PAY_KEY[x])}</span>)}
        </div>
        <div className="plan-acts">
          {p.yumiReservable
            ? <button className="primary" onClick={() => setBook(p)}>{t("bookBtn")}</button>
            : <button onClick={() => want(p)} disabled={wanted.includes(p.id)}>{wanted.includes(p.id) ? t("wantDone") : t("wantBook")}</button>}
          <button onClick={() => setTaxi(p)}><TaxiIcon size={14} /> {t("taxiBtn")}</button>
          <button onClick={() => setOrder(p)}><UtensilsIcon size={14} /> {t("orderBtn")}</button>
        </div>
      </div>
    </article>
  );

  return (
    <div className="shell">
      <header className="topnav"><span className="logo">{t("planTitle")}</span><LangSwitch /></header>
      <p className="muted pad small">{t("planSub")}</p>

      <form className="plan-form" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <div className="plan-row">
          <label className="h">{t("planWhere")} <span className="muted small">{t("concerts")}</span></label>
          <div className="plan-chips">
            {ANCHORS.filter((x) => x.kind === "concert").map((x) => <button type="button" key={x.key} className={anchor === x.key ? "on" : ""} onClick={() => setAnchor(x.key)}>{x.name[lang]}</button>)}
          </div>
          <label className="h small muted">{t("areas")}</label>
          <div className="plan-chips">
            {ANCHORS.filter((x) => x.kind === "area").map((x) => <button type="button" key={x.key} className={anchor === x.key ? "on" : ""} onClick={() => setAnchor(x.key)}>{x.name[lang]}</button>)}
          </div>
        </div>
        <div className="plan-row">
          <label className="h">{t("planWhen")}</label>
          <div className="plan-when">
            <input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={time} step={1800} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="plan-row">
          <label className="h">{t("planParty")}</label>
          <div className="seg">{[1, 2, 3, 4, 6, 8, 10].map((n) => <button type="button" key={n} className={party === n ? "on" : ""} onClick={() => setParty(n)}>{n}</button>)}</div>
        </div>
        <div className="plan-row">
          <label className="h">{t("planFilters")}</label>
          <div className="plan-chips">
            <button type="button" className={f.foreigner ? "on" : ""} onClick={() => toggle("foreigner")}>{t("fForeigner")}</button>
            <button type="button" className={f.pay.length ? "on" : ""} onClick={togglePay}>{t("fPay")}</button>
            <button type="button" className={f.halal ? "on" : ""} onClick={() => toggle("halal")}>{t("fHalal")}</button>
            <button type="button" className={f.vegan ? "on" : ""} onClick={() => toggle("vegan")}>{t("fVegan")}</button>
            <button type="button" className={f.group ? "on" : ""} onClick={() => toggle("group")}>{t("fGroup")}</button>
          </div>
        </div>
        <button className="primary wide big" disabled={busy}>{busy ? t("loading") : t("planGo")}</button>
      </form>

      {err && <p className="plan-note">{err}</p>}
      {res && (
        <>
          {atLabel && <p className="muted pad small">{t("planAt", { at: atLabel })}</p>}
          {res.bookable.length > 0 ? (
            <section className="sec">
              <div className="plan-head"><h2>{t("planBookable")} <span className="muted">{t("planBookableSub")}</span></h2></div>
              <div className="list">{res.bookable.map(card)}</div>
            </section>
          ) : res.walkIn.length > 0 && <p className="plan-note">{t("planNoneBook")}</p>}
          {res.walkIn.length > 0 && (
            <section className="sec">
              <div className="plan-head"><h2>{t("planWalk")} <span className="muted">{t("planWalkSub")}</span></h2></div>
              <div className="list">{res.walkIn.map(card)}</div>
            </section>
          )}
          {!res.bookable.length && !res.walkIn.length && <p className="plan-note">{t("planNone")}</p>}
        </>
      )}

      {book && <BookSheet place={book} lang={lang} sandbox={sandbox} initial={{ date, time, party }} onClose={() => setBook(null)} />}
      {taxi && <TaxiCard place={taxi} onClose={() => setTaxi(null)} />}
      {order && <OrderCard place={order} party={party} onClose={() => setOrder(null)} />}
      <TabBar active="plan" />
    </div>
  );
}
