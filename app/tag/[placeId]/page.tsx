"use client";
// Opened by tapping the in-store tag (or scanning its QR). Checks the fan into the store
// and opens a photocard trading board limited to people who are physically here right now.
import { Suspense, use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { errKey } from "@/lib/useMe";
import { useT, LangSwitch } from "@/lib/i18n";
import { PlaceName } from "@/lib/placeName";
import { subjectName } from "@/lib/subjects";
import { CheckIcon, CloseIcon, NfcIcon, ShieldIcon } from "@/components/Icons";

type Offer = { id: string; uid: string; nick: string; give: string };
type Trade = { id: string; uid: string; nick: string; have: string; want: string; note: string; at: string; offers: Offer[]; accepted?: { offerId: string; code: string } | null; doneOwner: boolean; donePartner: boolean };
type Room = { place: { name?: string; address?: { road?: string } } | null; me: string | null; signedIn: boolean; here: boolean; people: { nick: string; lang: string }[]; trades: Trade[] };

const MEMBERS = ["RM", "진", "슈가", "제이홉", "지민", "뷔", "정국"];
const FLAG: Record<string, string> = { ko: "🇰🇷", en: "🌎", ja: "🇯🇵", zh: "🇨🇳" };

function TagInner({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = use(params);
  const token = useSearchParams().get("t");
  const { t, lang } = useT();
  const [room, setRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({ have: "지민", haveD: "", want: "정국", wantD: "", note: "" });
  const [giving, setGiving] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  // The popup that opens right after the tag tap: what I have / want, and who here matches.
  const [pop, setPop] = useState(false);
  const [mine2, setMine2] = useState({ have: "지민", want: "정국" });
  const tried = useRef(false);

  const label = (v: string) => { const [m, d] = v.split(" · "); return `${subjectName(m, lang)}${d ? ` · ${d}` : ""}`; };
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2200); };
  const api = async (body: object) => {
    const res = await fetch(`/api/room/${placeId}`, { method: "POST", body: JSON.stringify({ lang, ...body }) }).then((r) => r.json());
    if (res.error) flash(t(errKey(res.error)));
    return res;
  };
  const load = () => fetch(`/api/room/${placeId}`).then((r) => r.json()).then(setRoom);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function join() {
    const res = await api({ action: "join", token });
    await load();
    if (!res.error) setPop(true);
  }

  // Tapping the tag is the entry: signed-in fans are checked in without another button press.
  useEffect(() => {
    if (!room || tried.current) return;
    if (room.signedIn && !room.here && token) { tried.current = true; join(); }
    else if (room.here) {
      tried.current = true;
      try { if (!sessionStorage.getItem(`tagpop:${placeId}`)) setPop(true); } catch { setPop(true); }
    }
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps
  const closePop = () => { setPop(false); try { sessionStorage.setItem(`tagpop:${placeId}`, "1"); } catch {} };

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const res = await api({ action: "post", have: form.have + (form.haveD ? ` · ${form.haveD}` : ""), want: form.want + (form.wantD ? ` · ${form.wantD}` : ""), note: form.note });
    if (!res.error) setForm({ ...form, haveD: "", wantD: "", note: "" });
    load();
  }

  async function offer(tr: Trade) {
    const res = await api({ action: "offer", tradeId: tr.id, give: giving[tr.id] || tr.want });
    if (!res.error) flash(t("tradeSent"));
    load();
  }

  const uid = room?.me ?? "";
  const mine = (tr: Trade) => tr.uid === uid;
  const myOffer = (tr: Trade) => tr.offers.find((o) => o.uid === uid);
  const matched = (tr: Trade) => tr.accepted && (mine(tr) || tr.offers.find((o) => o.id === tr.accepted!.offerId)?.uid === uid);
  const iConfirmed = (tr: Trade) => (mine(tr) ? tr.doneOwner : tr.donePartner);

  return (
    <div className="shell">
      <header className="topnav"><span className="logo">Fan Table</span><LangSwitch /></header>

      <section className="tag-hero">
        {room?.here && <span className="tag-ok"><NfcIcon size={18} /> {t("tagWelcome")}</span>}
        {room?.place?.name ? <PlaceName name={room.place.name} as="h1" /> : <h1>…</h1>}
        <div className="tag-people">
          <span className="dot-live" /> {t("tagHere", { n: room?.people.length ?? 0 })}
          <span className="tag-flags">{room?.people.slice(0, 8).map((p, i) => <span key={i} title={p.nick}>{FLAG[p.lang] ?? "🌎"}</span>)}</span>
        </div>
      </section>

      {room && !room.signedIn ? (
        <div className="block tag-join">
          <p>{t("err_login_required")}</p>
          <a href={`/me?next=${encodeURIComponent(`/tag/${placeId}${token ? `?t=${token}` : ""}`)}`}><button className="primary wide big">{t("goLogin")}</button></a>
          <p className="muted small center">{t("tagOnly")}</p>
        </div>
      ) : !room?.here ? (
        <form className="block tag-join" onSubmit={(e) => { e.preventDefault(); join(); }}>
          <button className="primary wide big">{t("tagJoin")}</button>
          <p className="muted small center">{t("tagOnly")}</p>
        </form>
      ) : (
        <>
          <section className="sec">
            <h2>{t("tradeTitle")} <span className="muted">{t("tradeSub")}</span></h2>
            <p className="pad small safe"><ShieldIcon size={16} /> {t("tradeSafe")}</p>

            <form className="block trade-form" onSubmit={post}>
              <div className="trade-row">
                <label>{t("tradeHave")}</label>
                <div className="seg">{MEMBERS.map((m) => <button type="button" key={m} className={form.have === m ? "on" : ""} onClick={() => setForm({ ...form, have: m })}>{subjectName(m, lang)}</button>)}</div>
                <input value={form.haveD} onChange={(e) => setForm({ ...form, haveD: e.target.value })} placeholder={t("tradeDetail")} />
              </div>
              <div className="trade-row">
                <label>{t("tradeWant")}</label>
                <div className="seg">{MEMBERS.map((m) => <button type="button" key={m} className={form.want === m ? "on" : ""} onClick={() => setForm({ ...form, want: m })}>{subjectName(m, lang)}</button>)}</div>
                <input value={form.wantD} onChange={(e) => setForm({ ...form, wantD: e.target.value })} placeholder={t("tradeDetail")} />
              </div>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t("tradeNote")} />
              <button className="primary wide">{t("tradePost")}</button>
            </form>
          </section>

          <section className="sec">
            {room.trades.length === 0 && <p className="muted pad">{t("tradeEmpty")}</p>}
            <div className="list">
              {room.trades.map((tr) => (
                <article key={tr.id} className={`trade ${matched(tr) ? "trade-match" : ""}`}>
                  <div className="trade-top">
                    <span className="muted small">{tr.nick}{mine(tr) && ` · ${t("tradeMine")}`}</span>
                    {tr.note && <span className="muted small">· {tr.note}</span>}
                  </div>
                  {!mine(tr) && (
                    <div className="trade-mod">
                      <button onClick={async () => { const r = await api({ action: "report", tradeId: tr.id }); if (!r.error) flash(t("reported")); }}>{t("report")}</button>
                      <button onClick={async () => { const r = await api({ action: "block", target: tr.uid }); if (!r.error) { flash(t("blocked")); load(); } }}>{t("blockUser")}</button>
                    </div>
                  )}
                  <div className="swap">
                    <span className="pc-chip have">{label(tr.have)}</span>
                    <span className="swap-arrow">⇄</span>
                    <span className="pc-chip want">{label(tr.want)}</span>
                  </div>

                  {matched(tr) ? (
                    <div className="meet">
                      <b><CheckIcon size={16} /> {t("tradeMeet")}</b>
                      <span>{t("tradeCode")} <b className="code">{tr.accepted!.code}</b></span>
                      {iConfirmed(tr)
                        ? <p className="muted small">{t("waitingOther")}</p>
                        : <button className="ghost wide" onClick={async () => { await api({ action: "done", tradeId: tr.id }); load(); }}>{t("confirmDone")}</button>}
                    </div>
                  ) : mine(tr) ? (
                    <>
                      <div className="muted small">{t("tradeOffers", { n: tr.offers.length })}</div>
                      {tr.offers.map((o) => (
                        <div className="offer" key={o.id}>
                          <span><b>{o.nick}</b> → {label(o.give)}</span>
                          <button className="primary" onClick={async () => { await api({ action: "accept", tradeId: tr.id, offerId: o.id }); load(); }}>{t("tradeAccept")}</button>
                        </div>
                      ))}
                    </>
                  ) : myOffer(tr) ? (
                    <p className="muted small">{t("tradeWaiting")}</p>
                  ) : (
                    <div className="offer">
                      <select value={giving[tr.id] ?? tr.want.split(" · ")[0]} onChange={(e) => setGiving({ ...giving, [tr.id]: e.target.value })} aria-label={t("tradeGive")}>
                        {MEMBERS.map((m) => <option key={m} value={m}>{subjectName(m, lang)}</option>)}
                      </select>
                      <button className="primary" onClick={() => offer(tr)}>{t("tradeOffer")}</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {pop && room?.here && (() => {
        const matches = room.trades.filter((tr) => !mine(tr) && !tr.accepted && tr.have.split(" · ")[0] === mine2.want);
        return (
          <div className="backdrop" onClick={closePop}>
            <div className="bottom-sheet tagpop" onClick={(e) => e.stopPropagation()}>
              <div className="grip" />
              <div className="sheet-head">
                <span className="tag-ok"><NfcIcon size={18} /> {t("popTitle")}</span>
                <button className="icon" onClick={closePop} aria-label="Close"><CloseIcon size={18} /></button>
              </div>
              {room.place?.name && <PlaceName name={room.place.name} as="h2" />}
              <p className="muted"><span className="dot-live" /> {t("popHere", { n: room.people.length })}</p>
              <label className="h small">{t("popHave")}</label>
              <div className="seg">{MEMBERS.map((m) => <button type="button" key={m} className={mine2.have === m ? "on" : ""} onClick={() => setMine2({ ...mine2, have: m })}>{subjectName(m, lang)}</button>)}</div>
              <label className="h small">{t("popWant")}</label>
              <div className="seg">{MEMBERS.map((m) => <button type="button" key={m} className={mine2.want === m ? "on" : ""} onClick={() => setMine2({ ...mine2, want: m })}>{subjectName(m, lang)}</button>)}</div>
              {matches.length > 0 ? (
                <>
                  <b>{t("popMatch", { n: matches.length, w: subjectName(mine2.want, lang) })}</b>
                  {matches.slice(0, 4).map((tr) => (
                    <div className="match" key={tr.id}>
                      <span><b>{tr.nick}</b> · {label(tr.have)} <span className="muted small">· {t("popWants", { h: label(tr.want) })}</span></span>
                      {myOffer(tr)
                        ? <span className="pill">{t("tradeSent")}</span>
                        : <button className="primary" onClick={async () => { const r = await api({ action: "offer", tradeId: tr.id, give: mine2.have }); if (!r.error) flash(t("tradeSent")); load(); }}>{t("popOffer")}</button>}
                    </div>
                  ))}
                </>
              ) : (
                <p className="muted small">{t("popNoMatch", { w: subjectName(mine2.want, lang) })}</p>
              )}
              <button className="primary wide big" onClick={async () => { const r = await api({ action: "post", have: mine2.have, want: mine2.want, note: "" }); if (!r.error) { flash(`${t("popPost")} ✓`); closePop(); } load(); }}>{t("popPost")}</button>
              <button className="ghost wide" onClick={closePop}>{t("popBoard")}</button>
              <p className="muted small center"><ShieldIcon size={14} /> {t("tradeSafe")}</p>
            </div>
          </div>
        );
      })()}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function Tag(props: { params: Promise<{ placeId: string }> }) {
  return <Suspense><TagInner {...props} /></Suspense>;
}
