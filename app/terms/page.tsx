// Terms of service draft. Needs legal review before launch.
export const metadata = { title: "이용약관 · Fan Table" };

export default function Terms() {
  return (
    <main className="wrap legal-page">
      <span className="tag">초안 · 법률 검토 필요</span>
      <h1>이용약관</h1>
      <h2>1. 서비스</h2>
      <p>Fan Table은 헤이유미 데이터를 이용해 가게를 찾고, 예약 요청과 실시간 문의를 보내고, 매장 태그로 가게 안 이용자끼리 포토카드를 교환하도록 돕는 서비스예요.</p>
      <h2>2. 예약</h2>
      <ul>
        <li>예약은 <b>요청</b>이에요. 가게 사장님이 수락해야 확정돼요.</li>
        <li>실시간 답변(웨이팅, 입장 가능 여부)은 답한 시점 기준이며, 도착할 때 달라질 수 있어요.</li>
        <li>노쇼가 반복되면 이용이 제한될 수 있어요.</li>
      </ul>
      <h2>3. 포토카드 교환</h2>
      <ul>
        <li>교환은 <b>같은 가게 안에서 직접 만나서</b> 해요. 서비스는 교환 당사자가 아니며, 물품의 진위나 상태를 보증하지 않아요.</li>
        <li>돈을 주고받는 거래, 택배 거래, 외부 연락처 교환은 금지예요.</li>
        <li>신고된 글은 숨겨질 수 있고, 다른 이용자를 차단할 수 있어요.</li>
      </ul>
      <h2>4. 게시물</h2>
      <ul>
        <li>맛집 로그와 생카 등록 글은 사실에 맞게 써야 해요. 광고, 욕설, 다른 사람의 개인정보는 올릴 수 없어요.</li>
        <li>연예인 관련 정보는 공개 보도를 근거로 한 “다녀간 것으로 알려진” 정보이며, 보증이나 공식 인증이 아니에요.</li>
      </ul>
      <h2>5. 가입 조건</h2>
      <p>만 14세 이상만 가입할 수 있어요.</p>
      <p className="meta">시행일: [YYYY-MM-DD] · 문의: [연락처]</p>
      <a href="/me"><button>돌아가기</button></a>
    </main>
  );
}
