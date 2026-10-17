"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TabBar from "@/components/TabBar";
import FoodLog from "@/components/FoodLog";
import { NfcIcon, CheckIcon } from "@/components/Icons";
import { useT, LANGS } from "@/lib/i18n";
import { PlaceName } from "@/lib/placeName";
import { useMe, errKey } from "@/lib/useMe";
import { getBookings, getSubject, addMyLog, addStamp, getStamps, type Booking } from "@/lib/store";

// My page: real account (server session), profile, language and bookings.
function MeInner() {
  const { t, lang, setLang } = useT();
  const { me, refresh } = useMe();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next");
  const kakaoFinish = sp.get("kakao") === "finish";
  const kakaoErr = sp.get("kakao_error");
  const [kakaoOn, setKakaoOn] = useState(false);
  const [kakao, setKakao] = useState({ nickname: "", ageOk: false, consent: false });
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [owner, setOwner] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nickname: "", ageOk: false, consent: false, ownerCode: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [logFor, setLogFor] = useState<Booking | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { setBookings(getBookings()); setVisited(getStamps().map((s) => s.place)); }, []);
  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((c) => setKakaoOn(!!c.kakao)).catch(() => {});
    if (kakaoFinish) fetch("/api/auth").then((r) => r.json()).then((d) => d.kakaoPending && setKakao((k) => ({ ...k, nickname: d.kakaoPending.nickname })));
  }, [kakaoFinish]);

  async function finishKakao(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/auth", { method: "POST", body: JSON.stringify({ action: "kakao_finish", ...kakao }) }).then((r) => r.json());
    setBusy(false);
    if (res.error) return setErr(t(errKey(res.error)));
    await refresh();
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/me");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const body = mode === "login"
      ? { action: "login", email: form.email, password: form.password }
      : { action: "signup", email: form.email, password: form.password, nickname: form.nickname || form.email.split("@")[0], ageOk: form.ageOk, consent: form.consent, ...(owner ? { ownerCode: form.ownerCode } : {}) };
    const res = await fetch("/api/auth", { method: "POST", body: JSON.stringify(body) }).then((r) => r.json());
    setBusy(false);
    if (res.error) return setErr(t(errKey(res.error)));
    await refresh();
    // Only follow same-site paths after sign-in.
    if (next && next.startsWith("/") && !next.startsWith("//")) router.push(next);
  }

  async function logout() {
    await fetch("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    refresh();
  }

  async function remove() {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch("/api/auth", { method: "POST", body: JSON.stringify({ action: "delete" }) });
    refresh();
  }

  function arrived(b: Booking) {
    addStamp(b.place, b.image);
    setVisited((v) => [...v, b.place]);
    setNote("");
    setLogFor(b);
  }

  async function saveLog() {
    if (!logFor) return;
    const res = await fetch("/api/logs", {
      method: "POST",
      body: JSON.stringify({ place: logFor.place, placeId: logFor.placeId, image: logFor.image || null, note, subject: getSubject(), lang }),
    }).then((r) => r.json());
    if (res.error) { setToast(t(errKey(res.error))); setTimeout(() => setToast(""), 2500); return; }
    if (res.entry?.id) addMyLog(res.entry.id);
    setLogFor(null);
    setToast(t("logSaved"));
    setTimeout(() => setToast(""), 2000);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="shell">
      <header className="topnav"><span className="logo">{t("meTitle")}</span></header>

      {me === undefined ? <p className="muted pad">{t("loading")}</p> : !me && kakaoFinish ? (
        <form className="login" onSubmit={finishKakao}>
          <h1>{t("kakaoFinishTitle")}</h1>
          <p className="muted">{t("kakaoFinishSub")}</p>
          <input placeholder={t("nick")} maxLength={24} required value={kakao.nickname} onChange={(e) => setKakao({ ...kakao, nickname: e.target.value })} />
          <label className="check"><input type="checkbox" checked={kakao.ageOk} onChange={(e) => setKakao({ ...kakao, ageOk: e.target.checked })} /> {t("ageOk")}</label>
          <label className="check"><input type="checkbox" checked={kakao.consent} onChange={(e) => setKakao({ ...kakao, consent: e.target.checked })} /> <span>{t("agreeTerms")} (<a href="/terms" target="_blank">{t("terms")}</a> · <a href="/privacy" target="_blank">{t("privacy")}</a>)</span></label>
          {err && <p className="err">{err}</p>}
          <button className="primary wide big" disabled={busy}>{t("kakaoFinish")}</button>
        </form>
      ) : !me ? (
        <form className="login" onSubmit={submit}>
          <h1>{t("loginTitle")}</h1>
          <p className="muted">{t("loginSub")}</p>
          {kakaoOn && <>
            <a className="kakao-btn" href={`/api/auth/kakao?next=${encodeURIComponent(next ?? "/me")}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path fill="#000" d="M12 3.5c-5.2 0-9.4 3.3-9.4 7.4 0 2.6 1.7 4.9 4.3 6.2l-1.1 3.9c-.1.3.3.6.6.4l4.6-3.1c.3 0 .7.1 1 .1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.5 12 3.5Z" /></svg>
              {t("kakaoLogin")}
            </a>
            <p className="or-line"><span>{t("orEmail")}</span></p>
          </>}
          {kakaoErr && <p className="err">{t("err_kakao")}</p>}
          <input type="email" required autoComplete="email" placeholder={t("email")} value={form.email} onChange={set("email")} />
          <input type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={t("password")} value={form.password} onChange={set("password")} />
          {mode === "signup" && (
            <>
              <input placeholder={t("nick")} maxLength={24} value={form.nickname} onChange={set("nickname")} />
              <label className="check"><input type="checkbox" checked={form.ageOk} onChange={set("ageOk")} /> {t("ageOk")}</label>
              <label className="check"><input type="checkbox" checked={form.consent} onChange={set("consent")} /> <span>{t("agreeTerms")} (<a href="/terms" target="_blank">{t("terms")}</a> · <a href="/privacy" target="_blank">{t("privacy")}</a>)</span></label>
              <label className="check"><input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} /> {t("ownerMode")}</label>
              {owner && <input placeholder={t("ownerCode")} value={form.ownerCode} onChange={set("ownerCode")} />}
            </>
          )}
          {err && <p className="err">{err}</p>}
          <button className="primary wide big" disabled={busy}>{mode === "signup" ? t("signup") : t("loginAction")}</button>
          <button type="button" className="link center" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setErr(""); }}>
            {mode === "signup" ? t("haveAccount") : t("needAccount")}
          </button>
        </form>
      ) : (
        <>
          <section className="me-card">
            <span className="avatar-dot">{me.nickname.slice(0, 1).toUpperCase()}</span>
            <div className="me-who">
              <b>{me.nickname}</b>
              <span className="muted small">{me.email}{me.role === "owner" ? " · Owner" : ""}</span>
            </div>
            <button className="ghost" onClick={logout}>{t("logout")}</button>
          </section>
          {me.role === "owner" && <p className="pad"><a className="link" href="/owner">→ Fan Table 사장님</a></p>}

          <section className="sec">
            <h2>{t("language")}</h2>
            <div className="seg pad">
              {LANGS.map((l) => (
                <button key={l.code} className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>
                  {{ ko: "한국어", en: "English", ja: "日本語", zh: "中文" }[l.code]}
                </button>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>{t("bookings")}</h2>
            {bookings.length === 0 && <p className="muted pad">{t("noBookings")}</p>}
            <div className="list">
              {bookings.map((b) => (
                <div className="ticket" key={b.id}>
                  {b.image && <img className="ticket-img" src={b.image} alt="" referrerPolicy="no-referrer" />}
                  <div className="ticket-main">
                    <div className="muted small">{b.date} · {b.time} · {b.party}{lang === "ko" ? "명" : lang === "en" ? " people" : lang === "ja" ? "名" : "人"}</div>
                    <PlaceName name={b.place} />
                    <div className="green small"><CheckIcon size={12} /> {t("confirmed")}</div>
                  </div>
                  {!visited.includes(b.place) && (
                    <button className="tap" onClick={() => arrived(b)}><NfcIcon size={22} /><span>{t("arrived")}</span></button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="sec" id="log">
            <h2>{t("myRecords")} <span className="muted">{t("myRecordsSub")}</span></h2>
            <FoodLog embedded />
          </section>

          <section className="sec pad legal">
            <a href="/terms">{t("terms")}</a> · <a href="/privacy">{t("privacy")}</a> · <button className="link" onClick={remove}>{t("deleteAccount")}</button>
          </section>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
      {logFor && (
        <div className="backdrop" onClick={() => setLogFor(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <PlaceName name={logFor.place} as="h2" />
            <div className="block">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("logNotePh")} maxLength={140} />
              <button className="primary wide big" onClick={saveLog}>{t("saveLog")}</button>
            </div>
          </div>
        </div>
      )}
      <TabBar active="me" />
    </div>
  );
}

export default function Me() {
  return <Suspense><MeInner /></Suspense>;
}
