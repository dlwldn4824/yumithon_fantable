"use client";
// UI language mode. Korean by default; the choice is remembered per device.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PLAN } from "./i18n-plan";

export type Lang = "ko" | "en" | "ja" | "zh";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "ko", label: "한" },
  { code: "en", label: "EN" },
  { code: "ja", label: "日" },
  { code: "zh", label: "中" },
];
export const LOCALE: Record<Lang, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };

type Dict = Record<string, string>;
const D: Record<Lang, Dict> = {
  ko: {
    brandSub: "서울 · with HeyYumi", photoBy: "사진: {p}", password: "비밀번호 (8자 이상)", signup: "회원가입", loginAction: "로그인", haveAccount: "이미 계정이 있어요", needAccount: "처음이에요 · 회원가입", agreeTerms: "이용약관과 개인정보 처리방침에 동의해요", ageOk: "만 14세 이상이에요", deleteAccount: "계정 삭제", deleteConfirm: "계정과 내가 쓴 로그·교환 글이 모두 삭제돼요. 삭제할까요?", ownerMode: "사장님으로 가입", ownerCode: "사장님 초대 코드",
    err_email_taken: "이미 가입된 이메일이에요", err_bad_credentials: "이메일이나 비밀번호가 맞지 않아요", err_invalid_input: "입력한 내용을 다시 확인해 주세요", err_consent_required: "약관에 동의해 주세요", err_age_required: "만 14세 이상만 가입할 수 있어요", err_bad_owner_code: "초대 코드가 맞지 않아요", err_rate_limited: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요", err_login_required: "로그인이 필요해요", err_blocked_content: "연락처·송금·외부 링크·욕설은 쓸 수 없어요", err_tag_expired: "태그가 만료됐어요. 매장 태그를 다시 찍어 주세요", err_too_many_open_trades: "진행 중인 교환 글은 3개까지예요",
    loginToBook: "예약하려면 로그인이 필요해요", goLogin: "로그인하러 가기", bookConsent: "예약을 위해 이름·전화번호·이메일을 헤이유미와 가게에 전달하는 데 동의해요", report: "신고", reported: "신고했어요", blockUser: "차단", blocked: "차단했어요", confirmDone: "교환 완료 확인", waitingOther: "상대방 확인을 기다리는 중", privacy: "개인정보 처리방침", terms: "이용약관", demoTag: "예시", cafeVenues: "생카 열리는 카페", cafeVenuesSub: "생카 대관을 받는 곳", source: "출처", tagWelcome: "매장 태그 확인 완료", tagHere: "지금 이 가게에 {n}명", tagJoin: "입장하기", tagNickPh: "닉네임", tradeTitle: "포카 교환", tradeSub: "지금 이 가게에 있는 사람끼리만", tradeHave: "갖고 있는 포카", tradeWant: "원하는 포카", tradeDetail: "앨범·버전 (선택)", tradeNote: "어디 앉아 있어요? (예: 창가 테이블)", tradePost: "교환 올리기", tradeOffer: "교환 제안", tradeGive: "내가 줄 포카", tradeOffers: "제안 {n}개", tradeAccept: "수락", tradeMeet: "카운터 앞에서 만나요", tradeCode: "확인 코드", tradeDone: "교환 완료", tradeMine: "내 글", tradeEmpty: "아직 교환 글이 없어요. 첫 글을 올려보세요!", tradeSafe: "가게 안에서 직접 만나 교환해요 · 송금·택배 없음", tagOnly: "이 가게 태그를 찍은 사람만 볼 수 있어요", tradeSent: "제안을 보냈어요", tradeWaiting: "상대가 수락하면 만날 장소와 코드가 떠요", loginTitle: "Fan Table 시작하기", loginSub: "예약과 맛집 로그를 내 계정에 모아요", loginBtn: "시작하기", logout: "로그아웃", language: "언어", demoAccount: "데모용 계정 — 이 기기에만 저장돼요", arrived: "도착 · 태그 찍기", fCafe: "생카", bdayTitle: "다가오는 생일", bdayWeek: "생일 주간", bdayToday: "오늘 생일", cafeTitle: "생일카페", cafeSub: "팬이 등록한 이벤트", cafeEmpty: "아직 등록된 생카가 없어요. X 생카 공지 링크를 붙여넣어 첫 생카를 등록해 주세요.", cafePh: "X 생카 공지 링크 붙여넣기", cafeReg: "등록", cafeSource: "X 원문", cafeNotOnYumi: "유미 미등록 매장", cafeRegistered: "생카를 등록했어요", cafeFail: "X 게시물을 읽지 못했어요", registerEvent: "생카에 등록", tabBuddy: "버디", tabLog: "맛집 로그", tabMe: "마이",
    bannerTitle: "그들이 앉았던 자리, 예약까지 한 번에", bannerSub: "스타가 다녀간 서울 맛집 · 내 언어로 · 한국 계정 없이", famousStats: "{n}곳 중 AI 예약 {b}곳",
    buddyTitle: "버디", buddySub: "서울 맛집 여행 친구", buddyPh: "무엇이든 물어보세요 · 예: KSPO돔 끝나고 6명", buddyHi: "안녕하세요! 버디예요. 공연장 근처 맛집, 최애가 다녀간 곳, 지금 바로 갈 수 있는 곳을 찾아서 예약까지 도와드릴게요.",
    chip1: "고척스카이돔 공연 끝나고 4명", chip2: "정국이 간 맛집", chip3: "홍대 생카 근처 지금 2명", chip4: "트친이랑 같이 밥 먹기", thinking: "찾는 중…", ownersAsking: "사장님들께 물어보는 중…",
    st_closed_now: "지금은 영업 전", st_not_available: "실시간 문의 미지원", st_error: "확인 실패",
    xRead: "X 게시물", xVenue: "장소", xDates: "날짜", xFound: "유미에서 찾음", xNotFound: "유미에서 못 찾음",
    logTitle: "맛집 로그", logMine: "내 로그", logFans: "팬들의 로그", logEmpty: "아직 로그가 없어요. 다녀온 곳에서 태그를 찍고 로그를 남겨보세요.", like: "좋아요", share: "공유",
    meTitle: "마이", nick: "닉네임", saveLog: "로그 남기기", logNotePh: "한 줄 후기 (예: 냉면 진짜 맛있었어요!)", logSaved: "맛집 로그에 남겼어요", copied: "링크를 복사했어요",
    myCards: "내 포토카드", bookings: "내 예약", noBookings: "아직 예약이 없어요. 탐색이나 버디에서 예약해 보세요.", binder: "포토카드 바인더", unlock: "예약하고 열기", collected: "{n}/{g} 수집", newCard: "새 포토카드!", howTitle: "화제의 식탁을 모으는 스티커 앨범", how1: "예약", how2: "매장 태그 찍기", how3: "스티커 6개 → 커버 완성", aroundTitle: "이 주변 장소", famousTag: "화제", partnerTag: "예약 가능", askedOwner: "{p} 사장님께 예약 요청을 전달했어요.",
    heroTitle: "{who} 맛집 {n}곳 · AI 예약 가능 {b}곳",
    heroIdle: "그 사람이 앉았던 자리",
    heroSub: "한국 계정 없이, 내 언어로 바로 예약",
    searchPh: "어떤 언어로든 물어보세요",
    fAll: "전체", fFamous: "화제의 맛집", fBookable: "지금 예약 가능",
    around: "이 주변 장소",
    secFamous: "화제의 맛집", secFamousSub: "그들이 다녀간 곳",
    secNearby: "근처에서 대신 예약", secNearbySub: "유미 파트너",
    notBookable: "예약 불가", bookable: "예약 가능",
    bookNow: "바로 예약", book: "예약",
    wantBook: "여기 예약하고 싶어요", fansWant: "{n}명이 예약을 원해요",
    instant: "즉시 예약 요청", kmFrom: "{from}에서 {km}km",
    noNearby: "근처에 예약 가능한 파트너가 아직 없어요.", noSpots: "아직 등록된 화제의 맛집이 없어요.",
    visited: "{who}{ga} 다녀간 것으로 알려진 곳", featured: "{who}에 나온 곳", spots: "{n}곳",
    tabExplore: "탐색", tabPass: "내 패스", tabOwner: "사장님",
    check: "확인", bookTitle: "예약 · 한국 계정 필요 없음",
    today: "오늘", tomorrow: "내일", people: "인원",
    name: "이름", phone: "전화번호  +82 10 1234 5678", email: "이메일",
    note: "사장님께 메시지 (한국어로 번역해서 보내요)",
    demoFill: "데모 손님 채우기", sandbox: "샌드박스 모드 — 실제 요청은 보내지 않아요",
    request: "{time} · {n}명 예약 요청", sending: "보내는 중…", waiting: "사장님 응답 기다리는 중…",
    sent: "보냈어요. 지금 사장님 휴대폰과 포스에 요청이 떴어요…",
    cancelled: "사장님이 이 시간은 어렵대요. 다른 시간을 골라보세요.",
    expired: "5분 동안 답이 없었어요. 다른 시간이나 가게를 골라보세요.",
    askWait: "지금 웨이팅?", askSeats: "{n}명 바로 돼요?", asking: "사장님께 물어보는 중…",
    liveNA: "이 가게는 아직 실시간 문의가 안 돼요", closedNow: "지금은 영업시간이 아니에요 (사장님께 알림 안 보냄)",
    ownerChecked: "사장님 확인 {t}",
    lv_available: "지금 바로 오세요", lv_limited: "조금 기다리면 돼요", lv_unavailable: "지금은 어려워요",
    lv_soon: "곧 돼요", lv_not_offered: "취급 안 해요", lv_no_response: "5분 동안 답이 없었어요",
    staffSpeak: "{l} 응대 가능", loading: "불러오는 중…",
    doneTitle: "예약 확정 — 사장님이 수락했어요", doneSub: "{n}명 · {date} {time}. {email}로 안내를 보냈어요.",
    doneTag: "도착하면 카운터의 유미 태그에 휴대폰을 대고 스티커를 받으세요.", seePass: "내 패스에서 보기",
    passSub: "화제의 식탁 6곳 모으기", coverCap1: "그들이 앉았던 자리,", coverCap2: "이번엔 내가 앉는다.",
    passMore: "{n}곳 더 가면 커버 완성", passDone: "완성! 내 커버를 공유해 보세요",
    upcoming: "다가오는 예약", confirmed: "사장님 확정", imHere: "도착했어요\n태그 찍기",
    nextStickers: "다음 스티커", nextStickersSub: "예약하면 열려요", near: "{p} 근처", famousSpot: "화제의 맛집",
    pickStar: "탐색에서 인물을 고르면 열 수 있는 가게가 보여요.", stickerAdded: "스티커 획득 — {p}",
  },
  en: {
    brandSub: "Seoul · with HeyYumi", photoBy: "Photo: {p}", password: "Password (8+ characters)", signup: "Sign up", loginAction: "Log in", haveAccount: "I already have an account", needAccount: "New here · Sign up", agreeTerms: "I agree to the Terms and the Privacy Policy", ageOk: "I am 14 or older", deleteAccount: "Delete account", deleteConfirm: "This deletes your account and your logs and trades. Delete?", ownerMode: "Sign up as an owner", ownerCode: "Owner invite code",
    err_email_taken: "That email is already registered", err_bad_credentials: "Email or password is wrong", err_invalid_input: "Please check what you entered", err_consent_required: "Please agree to the terms", err_age_required: "You must be 14 or older", err_bad_owner_code: "That invite code doesn’t match", err_rate_limited: "Too many requests. Try again in a moment", err_login_required: "Please log in", err_blocked_content: "Contact details, payments, outside links and abuse aren’t allowed", err_tag_expired: "This tag expired. Tap the store tag again", err_too_many_open_trades: "You can have up to 3 open trades",
    loginToBook: "Log in to book", goLogin: "Go to log in", bookConsent: "I agree to share my name, phone and email with HeyYumi and the venue for this booking", report: "Report", reported: "Reported", blockUser: "Block", blocked: "Blocked", confirmDone: "Confirm trade done", waitingOther: "Waiting for the other person to confirm", privacy: "Privacy Policy", terms: "Terms", demoTag: "Example", cafeVenues: "Birthday-cafe venues", cafeVenuesSub: "cafes that host fan events", source: "Source", tagWelcome: "Store tag verified", tagHere: "{n} people here now", tagJoin: "Enter", tagNickPh: "Nickname", tradeTitle: "Photocard trade", tradeSub: "only with people in this store now", tradeHave: "I have", tradeWant: "I want", tradeDetail: "Album / version (optional)", tradeNote: "Where are you sitting? (e.g. window table)", tradePost: "Post a trade", tradeOffer: "Offer a trade", tradeGive: "Photocard I’ll give", tradeOffers: "{n} offers", tradeAccept: "Accept", tradeMeet: "Meet at the counter", tradeCode: "Check code", tradeDone: "Trade done", tradeMine: "Mine", tradeEmpty: "No trades yet. Post the first one!", tradeSafe: "Swap in person inside the store · no transfers, no shipping", tagOnly: "Only people who tapped this store’s tag can see this", tradeSent: "Offer sent", tradeWaiting: "When they accept, you’ll both see where to meet and a code", loginTitle: "Get started with Fan Table", loginSub: "Keep your bookings and food log in one place", loginBtn: "Continue", logout: "Log out", language: "Language", demoAccount: "Demo account — saved on this device only", arrived: "Arrived · tap tag", fCafe: "Bday cafes", bdayTitle: "Upcoming birthdays", bdayWeek: "Birthday week", bdayToday: "Birthday today", cafeTitle: "Birthday cafes", cafeSub: "events added by fans", cafeEmpty: "No birthday cafes yet. Paste an X announcement link to add the first one.", cafePh: "Paste an X birthday-cafe link", cafeReg: "Add", cafeSource: "X post", cafeNotOnYumi: "Not on Yumi yet", cafeRegistered: "Birthday cafe added", cafeFail: "Couldn’t read that X post", registerEvent: "Add to Bday cafes", tabBuddy: "Buddy", tabLog: "Food Log", tabMe: "My",
    bannerTitle: "Sit where they sat — and book it", bannerSub: "Seoul spots the stars visited · your language · no Korean account", famousStats: "{b} of {n} bookable by AI",
    buddyTitle: "Buddy", buddySub: "your Seoul food friend", buddyPh: "Ask anything · e.g. 6 of us after KSPO DOME", buddyHi: "Hi! I’m Buddy. I find food near your concert venue, places your star visited, and spots open right now — and book them for you.",
    chip1: "4 of us after the Gocheok Sky Dome show", chip2: "Where did Jungkook eat?", chip3: "2 people now near Hongdae bday cafes", chip4: "Eat together with fan friends", thinking: "Looking…", ownersAsking: "Asking the owners…",
    st_closed_now: "Not open yet", st_not_available: "No live answers", st_error: "Couldn’t check",
    xRead: "X post", xVenue: "Venue", xDates: "Dates", xFound: "Found on Yumi", xNotFound: "Not on Yumi",
    logTitle: "Food Log", logMine: "My log", logFans: "Fans’ log", logEmpty: "No logs yet. Tap the tag at a place you visit and leave a log.", like: "Like", share: "Share",
    meTitle: "My", nick: "Nickname", saveLog: "Save to log", logNotePh: "One line (e.g. best naengmyeon ever!)", logSaved: "Saved to your Food Log", copied: "Link copied",
    myCards: "My photocards", bookings: "My bookings", noBookings: "No bookings yet. Book from Explore or Buddy.", binder: "Photocard binder", unlock: "Book to unlock", collected: "{n}/{g} collected", newCard: "New photocard!", howTitle: "A sticker album of famous tables", how1: "Book", how2: "Tap the tag in store", how3: "6 stickers → cover done", aroundTitle: "Places around here", famousTag: "Famous", partnerTag: "Bookable", askedOwner: "We passed your request to {p}’s owner.",
    heroTitle: "{n} spots linked to {who} · {b} bookable by AI",
    heroIdle: "Where your favorite stars ate",
    heroSub: "Book nearby in your language — no Korean account.",
    searchPh: "Ask in any language",
    fAll: "All", fFamous: "Famous spots", fBookable: "Bookable now",
    around: "Around here",
    secFamous: "Famous spots", secFamousSub: "where they ate",
    secNearby: "Book nearby instead", secNearbySub: "Yumi partners",
    notBookable: "Not bookable", bookable: "Bookable",
    bookNow: "Book now", book: "Book",
    wantBook: "I want to book here", fansWant: "{n} fans want to book",
    instant: "Instant request", kmFrom: "{km}km from {from}",
    noNearby: "No bookable partner nearby yet.", noSpots: "No famous spots for that yet.",
    visited: "Reportedly visited by {who}", featured: "Featured on {who}", spots: "{n} spots",
    tabExplore: "Explore", tabPass: "My Pass", tabOwner: "Owners",
    check: "Check", bookTitle: "Book — no Korean account needed",
    today: "Today", tomorrow: "Tomorrow", people: "People",
    name: "Name", phone: "Phone  +1 555 123 4567", email: "Email",
    note: "Message to the owner (we translate it to Korean)",
    demoFill: "Fill demo guest", sandbox: "Sandbox mode — no real request is sent",
    request: "Request {time} · {n} people", sending: "Sending…", waiting: "Waiting for the owner…",
    sent: "Sent. The owner’s phone and POS just got your request…",
    cancelled: "The owner couldn’t take this time. Try another slot.",
    expired: "No answer in 5 minutes. Try another slot or spot.",
    askWait: "Wait now?", askSeats: "{n} people now?", asking: "Asking the owner…",
    liveNA: "This owner can’t answer live yet", closedNow: "Closed right now — owner not disturbed",
    ownerChecked: "owner checked {t}",
    lv_available: "Yes — come now", lv_limited: "Short wait / limited", lv_unavailable: "Not right now",
    lv_soon: "Soon", lv_not_offered: "Not offered", lv_no_response: "No answer in 5 min",
    staffSpeak: "Staff speak {l}", loading: "Loading…",
    doneTitle: "Booked — the owner accepted", doneSub: "{n} people · {date} {time}. Details were sent to {email}.",
    doneTag: "When you arrive, tap your phone on the Yumi tag at the counter to collect your sticker.", seePass: "See it in My Pass",
    passSub: "collect 6 famous tables", coverCap1: "Where they sat,", coverCap2: "now it’s my turn.",
    passMore: "{n} more tables to finish your cover", passDone: "Complete — share your cover!",
    upcoming: "Upcoming", confirmed: "Owner confirmed", imHere: "I’m here\ntap tag",
    nextStickers: "Next stickers", nextStickersSub: "book to unlock", near: "near {p}", famousSpot: "famous spot",
    pickStar: "Pick a star on Explore to see tables you can unlock.", stickerAdded: "Sticker added — {p}",
  },
  ja: {
    brandSub: "ソウル · with HeyYumi", photoBy: "写真: {p}", password: "パスワード（8文字以上）", signup: "新規登録", loginAction: "ログイン", haveAccount: "アカウントをお持ちの方", needAccount: "はじめての方・新規登録", agreeTerms: "利用規約とプライバシーポリシーに同意します", ageOk: "14歳以上です", deleteAccount: "アカウント削除", deleteConfirm: "アカウントとログ・交換投稿がすべて削除されます。削除しますか？", ownerMode: "店主として登録", ownerCode: "店主招待コード",
    err_email_taken: "このメールは登録済みです", err_bad_credentials: "メールまたはパスワードが違います", err_invalid_input: "入力内容を確認してください", err_consent_required: "規約に同意してください", err_age_required: "14歳以上のみ登録できます", err_bad_owner_code: "招待コードが一致しません", err_rate_limited: "リクエストが多すぎます。少し待ってから再度お試しください", err_login_required: "ログインが必要です", err_blocked_content: "連絡先・送金・外部リンク・暴言は書けません", err_tag_expired: "タグの有効期限切れです。もう一度タッチしてください", err_too_many_open_trades: "進行中の交換は3件までです",
    loginToBook: "予約にはログインが必要です", goLogin: "ログインへ", bookConsent: "予約のため名前・電話番号・メールをHeyYumiと店舗に提供することに同意します", report: "通報", reported: "通報しました", blockUser: "ブロック", blocked: "ブロックしました", confirmDone: "交換完了を確認", waitingOther: "相手の確認を待っています", privacy: "プライバシーポリシー", terms: "利用規約", demoTag: "例", cafeVenues: "センイルカフェ会場", cafeVenuesSub: "イベント貸切ができるカフェ", source: "出典", tagWelcome: "店舗タグを確認しました", tagHere: "今このお店に{n}人", tagJoin: "入場する", tagNickPh: "ニックネーム", tradeTitle: "トレカ交換", tradeSub: "今このお店にいる人同士だけ", tradeHave: "持っているトレカ", tradeWant: "欲しいトレカ", tradeDetail: "アルバム・バージョン（任意）", tradeNote: "どこに座っていますか？（例：窓際）", tradePost: "交換を投稿", tradeOffer: "交換を申し込む", tradeGive: "渡すトレカ", tradeOffers: "申し込み{n}件", tradeAccept: "承諾", tradeMeet: "カウンター前で会いましょう", tradeCode: "確認コード", tradeDone: "交換完了", tradeMine: "自分の投稿", tradeEmpty: "まだ投稿がありません。最初の交換を投稿しよう！", tradeSafe: "店内で直接会って交換 · 送金・郵送なし", tagOnly: "このお店のタグをタッチした人だけが見られます", tradeSent: "申し込みました", tradeWaiting: "承諾されると、会う場所とコードが表示されます", loginTitle: "Fan Tableをはじめる", loginSub: "予約とグルメログをアカウントにまとめよう", loginBtn: "はじめる", logout: "ログアウト", language: "言語", demoAccount: "デモ用アカウント — この端末にのみ保存", arrived: "到着 · タグをタッチ", fCafe: "センイルカフェ", bdayTitle: "もうすぐ誕生日", bdayWeek: "誕生日ウィーク", bdayToday: "今日が誕生日", cafeTitle: "センイルカフェ", cafeSub: "ファンが登録したイベント", cafeEmpty: "まだ登録がありません。Xの告知リンクを貼って最初のセンイルカフェを登録しよう。", cafePh: "Xのセンイルカフェ告知リンクを貼る", cafeReg: "登録", cafeSource: "Xの投稿", cafeNotOnYumi: "Yumi未登録", cafeRegistered: "センイルカフェを登録しました", cafeFail: "Xの投稿を読めませんでした", registerEvent: "センイルカフェに登録", tabBuddy: "バディ", tabLog: "グルメログ", tabMe: "マイ",
    bannerTitle: "あの人が座った席を、予約までひと息で", bannerSub: "スターが訪れたソウルの店 · あなたの言語で · 韓国アカウント不要", famousStats: "{n}軒中 AI予約 {b}軒",
    buddyTitle: "バディ", buddySub: "ソウルグルメ旅の友だち", buddyPh: "何でも聞いてね · 例：KSPOドーム終演後6名", buddyHi: "こんにちは！バディです。公演会場近くのお店、推しが行ったお店、今すぐ入れるお店を探して予約までお手伝いします。",
    chip1: "高尺スカイドーム公演後に4名", chip2: "ジョングクが行った店", chip3: "弘大センイルカフェ近くで今2名", chip4: "フォロワーと一緒にごはん", thinking: "探しています…", ownersAsking: "店主に聞いています…",
    st_closed_now: "営業前", st_not_available: "リアルタイム非対応", st_error: "確認できず",
    xRead: "Xの投稿", xVenue: "場所", xDates: "日付", xFound: "Yumiで発見", xNotFound: "Yumiに未登録",
    logTitle: "グルメログ", logMine: "マイログ", logFans: "ファンのログ", logEmpty: "まだログがありません。訪れた店でタグをタッチしてログを残しましょう。", like: "いいね", share: "シェア",
    meTitle: "マイ", nick: "ニックネーム", saveLog: "ログに残す", logNotePh: "ひとこと（例：冷麺が最高！）", logSaved: "グルメログに残しました", copied: "リンクをコピーしました",
    myCards: "マイフォトカード", bookings: "マイ予約", noBookings: "まだ予約がありません。探すかバディから予約してみてください。", binder: "フォトカードバインダー", unlock: "予約して開く", collected: "{n}/{g} 収集", newCard: "新しいフォトカード！", howTitle: "話題の食卓を集めるステッカーアルバム", how1: "予約", how2: "店内のタグをタッチ", how3: "6枚でカバー完成", aroundTitle: "この周辺のお店", famousTag: "話題", partnerTag: "予約可", askedOwner: "{p}の店主にリクエストを伝えました。",
    heroTitle: "{who}の店 {n}軒 · AI予約 {b}軒",
    heroIdle: "あの人が座った席へ",
    heroSub: "韓国アカウント不要、あなたの言語ですぐ予約",
    searchPh: "何語でも質問できます",
    fAll: "すべて", fFamous: "話題の店", fBookable: "今すぐ予約可",
    around: "この周辺",
    secFamous: "話題の店", secFamousSub: "彼らが訪れた場所",
    secNearby: "近くで代わりに予約", secNearbySub: "Yumiパートナー",
    notBookable: "予約不可", bookable: "予約可",
    bookNow: "今すぐ予約", book: "予約",
    wantBook: "ここを予約したい", fansWant: "{n}人が予約希望",
    instant: "すぐにリクエスト", kmFrom: "{from}から{km}km",
    noNearby: "近くに予約できるパートナーはまだありません。", noSpots: "まだ話題の店がありません。",
    visited: "{who}が訪れたとされる店", featured: "{who}に登場した店", spots: "{n}軒",
    tabExplore: "探す", tabPass: "マイパス", tabOwner: "店主",
    check: "確認", bookTitle: "予約 · 韓国アカウント不要",
    today: "今日", tomorrow: "明日", people: "人数",
    name: "お名前", phone: "電話番号  +81 90 1234 5678", email: "メール",
    note: "店主へのメッセージ（韓国語に翻訳します）",
    demoFill: "デモ客を入力", sandbox: "サンドボックス — 実際のリクエストは送信されません",
    request: "{time} · {n}名で予約リクエスト", sending: "送信中…", waiting: "店主の返事を待っています…",
    sent: "送信しました。店主のスマホとPOSに届きました…",
    cancelled: "この時間は難しいそうです。別の時間を選んでください。",
    expired: "5分間返事がありませんでした。別の時間かお店を選んでください。",
    askWait: "今の待ち時間は？", askSeats: "{n}名すぐ入れる？", asking: "店主に確認中…",
    liveNA: "このお店はまだリアルタイム確認に対応していません", closedNow: "営業時間外です（店主には通知していません）",
    ownerChecked: "店主確認 {t}",
    lv_available: "今すぐどうぞ", lv_limited: "少し待てば入れます", lv_unavailable: "今は難しいです",
    lv_soon: "もうすぐ", lv_not_offered: "取り扱いなし", lv_no_response: "5分間返事なし",
    staffSpeak: "{l}対応可", loading: "読み込み中…",
    doneTitle: "予約確定 — 店主が承認しました", doneSub: "{n}名 · {date} {time}。{email}に詳細を送りました。",
    doneTag: "到着したらカウンターのYumiタグにスマホをかざしてステッカーをゲット。", seePass: "マイパスで見る",
    passSub: "話題の食卓を6つ集めよう", coverCap1: "あの人が座った席に、", coverCap2: "今度は私が座る。",
    passMore: "あと{n}軒でカバー完成", passDone: "完成！カバーをシェアしよう",
    upcoming: "今後の予約", confirmed: "店主確定", imHere: "着きました\nタグをタッチ",
    nextStickers: "次のステッカー", nextStickersSub: "予約で解放", near: "{p}の近く", famousSpot: "話題の店",
    pickStar: "「探す」で人物を選ぶと解放できるお店が表示されます。", stickerAdded: "ステッカー獲得 — {p}",
  },
  zh: {
    brandSub: "首尔 · with HeyYumi", photoBy: "图片: {p}", password: "密码（8位以上）", signup: "注册", loginAction: "登录", haveAccount: "我已有账号", needAccount: "第一次来・注册", agreeTerms: "我同意使用条款和隐私政策", ageOk: "我已满14岁", deleteAccount: "删除账号", deleteConfirm: "将删除账号及你的日志和交换帖。确定删除？", ownerMode: "以店主身份注册", ownerCode: "店主邀请码",
    err_email_taken: "该邮箱已注册", err_bad_credentials: "邮箱或密码错误", err_invalid_input: "请检查输入内容", err_consent_required: "请同意条款", err_age_required: "需年满14岁", err_bad_owner_code: "邀请码不正确", err_rate_limited: "请求太多，请稍后再试", err_login_required: "请先登录", err_blocked_content: "不能填写联系方式、转账、外部链接或辱骂内容", err_tag_expired: "标签已过期，请重新碰一下店内标签", err_too_many_open_trades: "进行中的交换最多3个",
    loginToBook: "预订需要登录", goLogin: "去登录", bookConsent: "我同意为本次预订向HeyYumi和店家提供姓名、电话和邮箱", report: "举报", reported: "已举报", blockUser: "屏蔽", blocked: "已屏蔽", confirmDone: "确认交换完成", waitingOther: "等待对方确认", privacy: "隐私政策", terms: "使用条款", demoTag: "示例", cafeVenues: "生日咖啡场地", cafeVenuesSub: "可包场办应援的咖啡店", source: "来源", tagWelcome: "已验证店内标签", tagHere: "现在店里有{n}人", tagJoin: "进入", tagNickPh: "昵称", tradeTitle: "小卡交换", tradeSub: "仅限现在店里的人", tradeHave: "我有的小卡", tradeWant: "我想要的小卡", tradeDetail: "专辑·版本（可选）", tradeNote: "你坐在哪？（如：窗边桌）", tradePost: "发布交换", tradeOffer: "提出交换", tradeGive: "我给出的小卡", tradeOffers: "{n}个提议", tradeAccept: "接受", tradeMeet: "在柜台前见面", tradeCode: "确认码", tradeDone: "交换完成", tradeMine: "我的", tradeEmpty: "还没有交换帖。发布第一个吧！", tradeSafe: "在店内当面交换 · 无转账、无快递", tagOnly: "只有碰过本店标签的人才能看到", tradeSent: "已发送提议", tradeWaiting: "对方接受后，双方都会看到见面地点和确认码", loginTitle: "开始使用 Fan Table", loginSub: "把预订和美食日志收在一个账号里", loginBtn: "开始", logout: "退出登录", language: "语言", demoAccount: "演示账号 — 仅保存在此设备", arrived: "已到店 · 碰标签", fCafe: "生日咖啡", bdayTitle: "即将到来的生日", bdayWeek: "生日周", bdayToday: "今天生日", cafeTitle: "生日咖啡", cafeSub: "粉丝登记的活动", cafeEmpty: "还没有生日咖啡。粘贴X公告链接，登记第一个吧。", cafePh: "粘贴X生日咖啡公告链接", cafeReg: "登记", cafeSource: "X原帖", cafeNotOnYumi: "Yumi未收录", cafeRegistered: "已登记生日咖啡", cafeFail: "无法读取这条X帖子", registerEvent: "登记为生日咖啡", tabBuddy: "伙伴", tabLog: "美食日志", tabMe: "我的",
    bannerTitle: "坐上他们坐过的位置，一键预订", bannerSub: "明星去过的首尔餐厅 · 用你的语言 · 无需韩国账号", famousStats: "{n}家中 AI可订 {b}家",
    buddyTitle: "伙伴", buddySub: "你的首尔美食旅伴", buddyPh: "随便问 · 例：KSPO巨蛋散场后6人", buddyHi: "你好！我是伙伴。帮你找演出场馆附近的餐厅、偶像去过的店、现在就能进的店，并帮你预订。",
    chip1: "高尺巨蛋演出结束后4人", chip2: "田柾国去过的餐厅", chip3: "弘大生日咖啡附近 现在2人", chip4: "和粉丝朋友一起吃饭", thinking: "正在查找…", ownersAsking: "正在询问店主…",
    st_closed_now: "尚未营业", st_not_available: "不支持实时询问", st_error: "无法确认",
    xRead: "X帖子", xVenue: "地点", xDates: "日期", xFound: "已在Yumi找到", xNotFound: "Yumi未收录",
    logTitle: "美食日志", logMine: "我的日志", logFans: "粉丝日志", logEmpty: "还没有日志。在去过的店碰一下标签，留下日志吧。", like: "赞", share: "分享",
    meTitle: "我的", nick: "昵称", saveLog: "记到日志", logNotePh: "一句话（如：冷面太好吃了！）", logSaved: "已记到美食日志", copied: "链接已复制",
    myCards: "我的小卡", bookings: "我的预订", noBookings: "还没有预订。去探索或伙伴预订吧。", binder: "小卡收藏册", unlock: "预订解锁", collected: "已收集 {n}/{g}", newCard: "新小卡！", howTitle: "收集话题餐桌的贴纸相册", how1: "预订", how2: "到店碰一下标签", how3: "集齐6张完成封面", aroundTitle: "附近地点", famousTag: "话题", partnerTag: "可预订", askedOwner: "已将你的请求转达给{p}的店主。",
    heroTitle: "{who}的餐厅 {n}家 · AI可订 {b}家",
    heroIdle: "坐上他们坐过的位置",
    heroSub: "无需韩国账号，用你的语言立即预订",
    searchPh: "用任何语言提问",
    fAll: "全部", fFamous: "话题餐厅", fBookable: "现在可预订",
    around: "附近地点",
    secFamous: "话题餐厅", secFamousSub: "他们去过的地方",
    secNearby: "改订附近餐厅", secNearbySub: "Yumi合作店",
    notBookable: "不可预订", bookable: "可预订",
    bookNow: "立即预订", book: "预订",
    wantBook: "我想预订这里", fansWant: "{n}人想预订",
    instant: "即时预订请求", kmFrom: "距{from} {km}公里",
    noNearby: "附近暂无可预订的合作店。", noSpots: "暂无相关话题餐厅。",
    visited: "据报道{who}曾到访", featured: "曾出现在《{who}》", spots: "{n}家",
    tabExplore: "探索", tabPass: "我的通行证", tabOwner: "店主",
    check: "确认", bookTitle: "预订 · 无需韩国账号",
    today: "今天", tomorrow: "明天", people: "人数",
    name: "姓名", phone: "电话  +86 138 0000 0000", email: "邮箱",
    note: "给店主的留言（我们会翻译成韩语）",
    demoFill: "填入演示客人", sandbox: "沙盒模式 — 不会发送真实请求",
    request: "预订 {time} · {n}人", sending: "发送中…", waiting: "等待店主回复…",
    sent: "已发送。店主的手机和POS刚收到你的请求…",
    cancelled: "店主这个时间无法接待，请换个时间。",
    expired: "5分钟内没有回复，请换个时间或餐厅。",
    askWait: "现在要排队吗？", askSeats: "{n}人现在能进吗？", asking: "正在询问店主…",
    liveNA: "这家店暂不支持实时询问", closedNow: "现在不在营业时间（未打扰店主）",
    ownerChecked: "店主确认 {t}",
    lv_available: "现在就来吧", lv_limited: "稍等即可", lv_unavailable: "现在不行",
    lv_soon: "马上就好", lv_not_offered: "不提供", lv_no_response: "5分钟内未回复",
    staffSpeak: "可用{l}沟通", loading: "加载中…",
    doneTitle: "预订成功 — 店主已接受", doneSub: "{n}人 · {date} {time}。详情已发送至{email}。",
    doneTag: "到店后，用手机碰一下柜台的Yumi标签领取贴纸。", seePass: "在我的通行证查看",
    passSub: "收集6张话题餐桌", coverCap1: "他们坐过的位置，", coverCap2: "这次轮到我。",
    passMore: "再去{n}家即可完成封面", passDone: "完成！分享你的封面吧",
    upcoming: "即将到来的预订", confirmed: "店主已确认", imHere: "我到了\n碰一下标签",
    nextStickers: "下一张贴纸", nextStickersSub: "预订即可解锁", near: "{p}附近", famousSpot: "话题餐厅",
    pickStar: "在「探索」选择人物，即可看到可解锁的餐厅。", stickerAdded: "获得贴纸 — {p}",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("st-lang") as Lang | null;
      if (saved && saved in D) setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("st-lang", l); } catch {}
  };
  const t = (key: string, vars: Record<string, string | number> = {}) => {
    if (typeof vars.who === "string" && vars.ga === undefined) vars = { ...vars, ga: josaGa(vars.who) };
    return tt(key, vars);
  };
  const tt = (key: string, vars: Record<string, string | number> = {}) =>
    (D[lang][key] ?? PLAN[lang][key] ?? D.en[key] ?? PLAN.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

// 이/가 after a Korean word depending on its final consonant.
export function josaGa(w: string) {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "이" : "가";
}

export function useT() {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useT outside LangProvider");
  return c;
}

export function LangSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="langs" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.label}</button>
      ))}
    </div>
  );
}
