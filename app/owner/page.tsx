"use client";
import { useEffect, useState } from "react";
import { StoreIcon, NfcIcon } from "@/components/Icons";
import QRCode from "qrcode";



type Row = { id: string; name: string; count: number; langs: Record<string, number>; last: string; party?: number[] };

const LANG: Record<string, string> = { ko: "한국어", en: "영어", ja: "일본어", zh: "중국어" };

// Owner app (separate from the fan app): overseas fans who wanted to book a venue
// that isn't a Yumi partner yet. This is the sales hook for joining Yumi.
export default function Owner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [qr, setQr] = useState("");
  const [tagUrl, setTagUrl] = useState("");
  const [here, setHere] = useState(0);
  const [ttl, setTtl] = useState(0);
  const [place, setPlace] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  // Owner-only: the store tag link carries a token that rotates every 5 minutes, so the QR refreshes.
  useEffect(() => {
    const tick = async () => {
      const d = await fetch("/api/owner/tag").then((r) => r.json());
      if (d.error) return setAllowed(false);
      setAllowed(true);
      const url = `${location.origin}/tag/${d.placeId}?t=${d.token}`;
      setTagUrl((old) => { if (old !== url) QRCode.toDataURL(url, { margin: 1, width: 320 }).then(setQr); return url; });
      setHere(d.here);
      setTtl(d.ttl);
      const r = await fetch("/api/owner").then((x) => x.json());
      setRows(r.report ?? []);
      if (!place) fetch(`/api/room/${d.placeId}`).then((x) => x.json()).then((p) => setPlace(p.place?.name ?? ""));
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rows.reduce((n, r) => n + r.count, 0);

  return (
    <div className="owner-shell">
      <header className="owner-top">
        <span className="owner-logo"><StoreIcon size={20} /> Fan Table <b>사장님</b></span>
        <span className="muted small">powered by HeyYumi</span>
      </header>

      {allowed === false ? (
        <main className="owner-main">
          <section className="owner-hero">
            <b>사장님 계정으로 로그인해 주세요</b>
            <p>사장님 초대 코드로 가입하면, 내 가게의 해외 팬 수요와 매장 태그를 볼 수 있어요.</p>
            <a href="/me?next=/owner"><button className="primary wide big" style={{ marginTop: 12 }}>로그인 · 가입</button></a>
          </section>
        </main>
      ) : (
      <main className="owner-main">
        <section className="owner-hero">
          <div className="muted small">최근 해외 팬 예약 시도</div>
          <div className="owner-big">{total}<span>명</span></div>
          <p>예약하려고 했지만 가게가 아직 유미 파트너가 아니라 다른 가게로 안내됐어요.</p>
        </section>

        <section className="owner-tag">
          <div className="owner-tag-head"><NfcIcon size={18} /> <b>매장 태그</b> · {place}</div>
          <div className="owner-tag-body">
            {qr && <img src={qr} alt="매장 태그 QR" width={150} height={150} />}
            <div>
              <div className="muted small">지금 매장 안 팬</div>
              <div className="owner-big">{here}<span>명</span></div>
              <p className="muted small">손님이 태그를 대면 입장·포카 교환 화면이 열려요. 링크는 5분마다 바뀌어서 복사해도 금방 막혀요. (다음 갱신까지 {Math.floor(ttl / 60)}:{String(ttl % 60).padStart(2, "0")})</p>
              <a className="src" href={tagUrl} target="_blank" rel="noreferrer">{tagUrl.replace(/^https?:\/\//, "")}</a>
            </div>
          </div>
        </section>

        <section className="owner-list">
          {rows.length === 0 && <p className="muted">아직 기록이 없어요.</p>}
          {rows.map((r) => (
            <div className="owner-row" key={r.id}>
              <div>
                <b>{r.name}</b>
                <div className="muted small">
                  {Object.entries(r.langs).map(([l, n]) => `${LANG[l] ?? l} ${n}명`).join(" · ")}
                  {r.last && ` · 마지막 ${new Date(r.last).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
                </div>
              </div>
              <div className="owner-count">{r.count}<span>명</span></div>
            </div>
          ))}
        </section>

        <section className="owner-cta">
          <b>유미 사장님 앱에 가입하면</b>
          <ul>
            <li>해외 팬 예약 요청이 휴대폰과 포스로 바로 와요</li>
            <li>“지금 2명 돼요?” 실시간 문의에 버튼 하나로 답해요</li>
            <li>번역은 자동, 수수료 없이 무료예요</li>
          </ul>
          <a href="https://heyyumi.ai/partners" target="_blank" rel="noreferrer"><button className="primary wide big">유미 사장님 앱으로 이 손님 받기</button></a>
        </section>
      </main>
      )}
    </div>
  );
}
