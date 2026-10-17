"use client";
import dynamic from "next/dynamic";
import { PlaceName, useCat, useDistrict } from "@/lib/placeName";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Pin } from "@/components/FanMap";
import BookSheet, { type Place } from "@/components/BookSheet";
import CafeSection, { type FanEvent } from "@/components/CafeSection";
import DragSheet from "@/components/DragSheet";
import TabBar from "@/components/TabBar";
import { SearchIcon, CheckIcon, ChipIcon, ChefIcon, MicIcon, StarIcon, NoteIcon, HeadphonesIcon, FoodIcon } from "@/components/Icons";

const TOPIC_ICON = { chip: ChipIcon, chef: ChefIcon, mic: MicIcon, star: StarIcon, note: NoteIcon, headphones: HeadphonesIcon };
import { setSubject } from "@/lib/store";
import { useT, LangSwitch } from "@/lib/i18n";
import { SUBJECTS, subjectName, isSubjectKey } from "@/lib/subjects";
import { Squiggle, SQUIGGLE_A, Sparkle } from "@/components/Doodles";

const FanMap = dynamic(() => import("@/components/FanMap"), { ssr: false, loading: () => <div className="map map-loading" /> });

type Result = {
  place: Place; image: string | null; story: string | null; storySubject: string; storyIsShow: boolean; storyDate: string | null;
  fansTried: number; alternatives: Place[];
  source: { url: string; publisher?: string; publishedAt?: string } | null;
};
type SearchRes = {
  parsed: { lang: string; celebrity: string | null; partySize: number | null };
  sandbox: boolean; available: string[]; stats: { spots: number; bookable: number }; results: Result[]; error?: string;
};


type Filter = "all" | "famous" | "bookable" | "cafe";

export default function Home() {
  const { t, lang } = useT();
  const cat = useCat();
  const district = useDistrict();
  const titleRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [subject, setSubjectKey] = useState<string | null>(SUBJECTS[0].key);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<SearchRes | null>(null);
  const [active, setActive] = useState<string>();
  const [booking, setBooking] = useState<Place | null>(null);
  const [toast, setToast] = useState("");
  const [aroundOpen, setAroundOpen] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const press = useRef<number | null>(null);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  async function run(body: { q?: string; subject?: string }) {
    setBusy(true);
    setActive(undefined);
    const res = await fetch("/api/search", { method: "POST", body: JSON.stringify({ ...body, lang }) });
    const d = await res.json();
    setData(d);
    if (isSubjectKey(d?.parsed?.celebrity)) setSubject(d.parsed.celebrity);
    setBusy(false);
  }
  function pickSubject(key: string) {
    setSubjectKey(key);
    setQ("");
    setSubject(key);
    run({ subject: key });
  }
  function searchText() {
    if (!q.trim()) return;
    setSubjectKey(null);
    run({ q });
  }

  // Re-run when the UI language changes so story lines come back in that language.
  useEffect(() => {
    if (subject) run({ subject });
    else if (q.trim()) run({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Famous spot that isn't on Yumi yet: log the fan demand once per device for the owner,
  // then go straight to booking the nearest Yumi partner instead.
  async function bookFamous(r: Result) {
    const key = `st-asked-${r.place.id}`;
    let asked = false;
    try { asked = localStorage.getItem(key) === "1"; } catch {}
    if (!asked) {
      try { localStorage.setItem(key, "1"); } catch {}
      fetch("/api/owner", { method: "POST", body: JSON.stringify({ id: r.place.id, name: r.place.name, lang }) })
        .then((x) => x.json())
        .then(({ fansTried }) => setData((d) => d && { ...d, results: d.results.map((x) => (x.place.id === r.place.id ? { ...x, fansTried } : x)) }));
    }
    const alt = r.alternatives[0];
    if (alt) setBooking(alt);
    else { setToast(t("askedOwner", { p: r.place.name })); setTimeout(() => setToast(""), 2600); }
  }

  const nearby = useMemo(() => {
    const seen = new Map<string, Place & { from: string }>();
    for (const r of data?.results ?? []) for (const a of r.alternatives) if (!seen.has(a.id)) seen.set(a.id, { ...a, from: r.place.name });
    return [...seen.values()];
  }, [data]);

  const pins = useMemo<Pin[]>(() => {
    if (filter === "cafe")
      return events.filter((e) => e.lat && e.lng && e.placeId).map((e) => ({ id: e.placeId!, name: e.place ?? "", lat: e.lat!, lng: e.lng!, kind: e.yumiReservable ? "bookable" : "spot" }));
    if (!data?.results) return [];
    const out: Pin[] = [];
    if (filter !== "bookable")
      for (const r of data.results)
        out.push({ id: r.place.id, name: r.place.name, lat: r.place.location.lat, lng: r.place.location.lng, kind: r.place.yumiReservable ? "bookable" : "spot" });
    if (filter !== "famous")
      for (const r of data.results)
        for (const a of r.alternatives)
          out.push({ id: a.id, name: a.name, lat: a.location.lat, lng: a.location.lng, kind: "bookable", parent: filter === "all" ? r.place.id : undefined });
    return out;
  }, [data, filter, events]);

  function pick(id: string) {
    setActive(id);
    document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  // Keep the hero headline on one line: shrink it only when it would overflow.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || lang === "en") return;
    const fit = () => {
      el.style.fontSize = "";
      const over = el.scrollWidth / el.clientWidth;
      if (over > 1) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) / over - 0.5}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });

  const who = data?.parsed.celebrity ? subjectName(data.parsed.celebrity, lang) : "";
  const story = (r: Result) =>
    r.story ?? t(r.storyIsShow ? "featured" : "visited", { who: subjectName(r.storySubject, lang) }) + (r.storyDate ? ` (${r.storyDate.slice(0, 7)})` : "");

  return (
    <div className="shell">
      <header className="topnav">
        <span className="logo">Fan Table</span><span className="logo-sub">{t("brandSub")}</span>
        <LangSwitch />
      </header>

      <section className="hero">
        <Squiggle className="sq sq-a" d={SQUIGGLE_A} />
        <Sparkle className="dd-1" size={34} />
        <div className="hero-kicker">SEOUL FAMOUS TABLES · VOL.01</div>
        <div className="hero-title" ref={titleRef}>
          {t("bannerTitle")}
        </div>
        <div className="hero-sub">{t("bannerSub")}</div>
      </section>

      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); searchText(); }}>
        <SearchIcon size={18} className="muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} aria-label={t("searchPh")} />
        {busy && <span className="spin" />}
      </form>

      <div className="topics">
        {SUBJECTS.map((s) => {
          const on = subject === s.key && data?.stats;
          return (
            <button key={s.key} className={`topic ${s.tone} ${on ? "topic-on" : ""}`} onClick={() => pickSubject(s.key)}>
              <span className="topic-icon">{(() => { const I = TOPIC_ICON[s.icon]; return <I size={24} />; })()}</span>
              <span className="topic-name">{s.name[lang]}</span>
              <span className="topic-kind">{on ? t("spots", { n: data!.stats.spots }) : s.kind[lang]}</span>
            </button>
          );
        })}
      </div>

      <div className="filters">
        {([["all", t("fAll")], ["famous", t("fFamous")], ["bookable", t("fBookable")], ["cafe", t("fCafe")]] as [Filter, string][]).map(([k, l]) => (
          <button key={k} className={`fpill ${filter === k ? "fpill-on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <div className="map-wrap">
        <FanMap pins={pins} active={active} onPick={pick} />
        <button
          className="map-sheet"
          onClick={() => { if (!aroundOpen) { setDragFrom(null); setAroundOpen(true); } }}
          onPointerDown={(e) => { e.preventDefault(); press.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            // Pulling the bar up opens the list and hands the drag over to the sheet.
            if (press.current != null && press.current - e.clientY > 8 && !aroundOpen) {
              setDragFrom(press.current);
              setAroundOpen(true);
              press.current = null;
            }
          }}
          onPointerUp={() => { press.current = null; }}
          style={{ touchAction: "none" }}
        ><span className="grip" />{t("around")} <b>{pins.length}</b></button>
      </div>

      {data?.error && <p className="err pad">{data.error}</p>}

      {filter === "cafe" && <CafeSection onBook={setBooking} onEvents={setEvents} />}

      {filter !== "bookable" && filter !== "cafe" && (
        <section className="sec">
          <h2>{who ? `${who} · ` : ""}{t("secFamous")} <span className="muted">{data?.stats ? t("famousStats", { n: data.stats.spots, b: data.stats.bookable }) : t("secFamousSub")}</span></h2>
          <div className="hscroll">
            {data?.results.map((r) => (
              <article id={`card-${r.place.id}`} key={r.place.id} className={`tile ${active === r.place.id ? "tile-on" : ""}`} onClick={() => setActive(r.place.id)}>
                <div className="tile-img">
                  {r.image
                    ? <img className="photo" src={r.image} alt="" referrerPolicy="no-referrer" loading="lazy" />
                    : <span className="tile-emoji"><FoodIcon label={r.place.categoryLabel} size={72} /></span>}
                  {r.image && r.source?.publisher && <span className="credit">{t("photoBy", { p: r.source.publisher })}</span>}
                  <span className={`tile-badge ${r.place.yumiReservable ? "ok" : "no"}`}>{r.place.yumiReservable ? t("bookable") : <><StarIcon size={12} /> {subjectName(r.storySubject, lang)}</>}</span>
                  <div className="tile-cap">
                    <div className="tile-where">{district(r.place.address?.road)} · {cat(r.place.categoryLabel)}</div>
                    <PlaceName name={r.place.name} as="span" className="tile-name" />
                  </div>
                </div>
                <p className="tile-story">{story(r)}</p>
                {r.source && (
                  <a className="src" href={r.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    {r.source.publisher ?? "news"}{r.source.publishedAt ? ` · ${r.source.publishedAt.slice(0, 10)}` : ""} ↗
                  </a>
                )}
                {r.place.yumiReservable ? (
                  <button className="primary wide" onClick={() => setBooking(r.place)}>{t("bookNow")}</button>
                ) : (
                  <>
                    <button className="primary wide" onClick={(e) => { e.stopPropagation(); bookFamous(r); }}>{t("bookNow")}</button>
                    {r.fansTried > 0 && <div className="fans">{t("fansWant", { n: r.fansTried })}</div>}
                  </>
                )}
              </article>
            ))}
            {busy && !data && [0, 1].map((i) => <div key={i} className="tile skeleton" />)}
          </div>
        </section>
      )}

      {filter !== "famous" && filter !== "cafe" && (
        <section className="sec">
          <h2>{t("secNearby")} <span className="muted">{t("secNearbySub")}</span></h2>
          {nearby.length === 0 && !busy && <p className="muted pad">{t("noNearby")}</p>}
          <div className="list">
            {nearby.map((a) => (
              <div className={`row-item ${active === a.id ? "tile-on" : ""}`} key={a.id} id={`card-${a.id}`}>
                <span className="thumb">{a.image ? <img className="photo" src={a.image} alt="" loading="lazy" /> : <FoodIcon label={a.categoryLabel} />}</span>
                <div className="row-body">
                  <div className="muted small">{district(a.address?.road)} · {a.distanceM != null ? t("kmFrom", { km: (a.distanceM / 1000).toFixed(1), from: a.from }) : ""}</div>
                  <PlaceName name={a.name} />
                  <div className="muted small">{cat(a.categoryLabel)} · <span className="green"><CheckIcon size={12} /> {t("instant")}</span></div>
                </div>
                <button className="primary" onClick={() => setBooking(a)}>{t("book")}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <TabBar active="map" />

      {toast && <div className="toast">{toast}</div>}
      <DragSheet open={aroundOpen && !!data?.results} startY={dragFrom} onClose={() => { setAroundOpen(false); setDragFrom(null); }}>
            <h2>{t("aroundTitle")} <span className="muted small">{pins.length}</span></h2>
            <div className="list" style={{ padding: 0, marginTop: 12 }}>
              {data?.results.map((r) => (
                <div className="row-item" key={`f-${r.place.id}`}>
                  <span className="thumb">{r.image ? <img className="photo" src={r.image} alt="" referrerPolicy="no-referrer" /> : <FoodIcon label={r.place.categoryLabel} />}</span>
                  <div className="row-body">
                    <div className="muted small"><span className="pill pill-icon"><StarIcon size={12} /> {subjectName(r.storySubject, lang)}</span> {district(r.place.address?.road)}</div>
                    <PlaceName name={r.place.name} />
                    <div className="muted small">{cat(r.place.categoryLabel)}</div>
                  </div>
                  <button className="primary" onClick={() => { setAroundOpen(false); r.place.yumiReservable ? setBooking(r.place) : bookFamous(r); }}>{t("book")}</button>
                </div>
              ))}
              {nearby.map((a) => (
                <div className="row-item" key={`n-${a.id}`}>
                  <span className="thumb">{a.image ? <img className="photo" src={a.image} alt="" /> : <FoodIcon label={a.categoryLabel} />}</span>
                  <div className="row-body">
                    <div className="muted small"><span className="pill pill-ok">{t("partnerTag")}</span> {a.distanceM != null ? t("kmFrom", { km: (a.distanceM / 1000).toFixed(1), from: a.from }) : ""}</div>
                    <PlaceName name={a.name} />
                    <div className="muted small">{cat(a.categoryLabel)}</div>
                  </div>
                  <button className="primary" onClick={() => { setAroundOpen(false); setBooking(a); }}>{t("book")}</button>
                </div>
              ))}
            </div>
      </DragSheet>
      {booking && <BookSheet place={booking} lang={lang} sandbox={data?.sandbox ?? true} onClose={() => setBooking(null)} />}
    </div>
  );
}

