import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white px-6">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur safe-area-top pb-3 flex items-center gap-3 border-b border-gray-100">
        <Link to="/solo" className="text-[12px] text-gray-300 hover:text-black transition font-medium">← 돌아가기</Link>
        <span className="text-[13px] font-bold text-black tracking-tight">개인정보처리방침</span>
      </div>

      <div className="py-8 space-y-8 text-[14px] leading-relaxed text-gray-600">

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-1">Last updated</p>
          <p className="text-[15px] font-black text-black tracking-tight">2026. 07. 03</p>
        </div>

        <Section title="서비스 소개">
          WordDay는 Firebase Hosting으로 제공되는 영어 단어 학습 웹 서비스입니다.
          본 방침은 서비스 이용 과정에서 수집되는 정보와 그 처리 방법을 설명합니다.
        </Section>

        <Section title="수집하는 정보">
          <ul className="space-y-2 list-none">
            <Li><b>교사 계정:</b> 아이디, 비밀번호의 단방향 해시값, 이름, 학교명, 보안 질문 및 답변의 단방향 해시값</Li>
            <Li><b>학생 계정:</b> 이름, 학번, 비밀번호의 단방향 해시값 — 학급 코드를 통해 교사가 등록</Li>
            <Li><b>학습 데이터:</b> 퀴즈 점수, 테스트 결과</Li>
            <Li><b>알림 데이터:</b> 알림을 허용한 기기의 푸시 토큰, 사용자 역할 및 학급 식별자</Li>
          </ul>
        </Section>

        <Section title="정보 이용 목적">
          <ul className="space-y-2 list-none">
            <Li>교사·학생 로그인 및 학급 관리 기능 제공</Li>
            <Li>퀴즈 결과 조회 및 학습 현황 확인</Li>
            <Li>사용자가 허용한 기기에 시험 초대와 학습 알림 제공</Li>
          </ul>
        </Section>

        <Section title="브라우저 저장소 사용">
          로그인 상태와 학생이 선택한 학급 코드·학번을 유지하기 위해 브라우저의 로컬·세션 저장소를 사용합니다.
          현재 맞춤형 광고 또는 광고 쿠키는 사용하지 않습니다. 브라우저 저장소를 삭제하면 저장된 로그인 상태와 학습 중 임시 정보가 사라질 수 있습니다.
          푸시 알림을 허용하면 기기 토큰을 로컬 저장소와 Firestore에 보관하며, 앱 설정에서 알림 등록을 해제할 수 있습니다.
        </Section>

        <Section title="정보의 보관 및 파기">
          <ul className="space-y-2 list-none">
            <Li>계정 정보는 서비스 이용 기간 동안 보관하며, 삭제 요청을 접수하면 확인 후 관련 정보를 삭제합니다.</Li>
            <Li>교사가 학생 또는 테스트를 삭제하면 해당 로그인 정보 또는 테스트 결과도 함께 삭제됩니다.</Li>
            <Li>비밀번호와 보안 질문 답변은 SHA-256 단방향 해시값으로 저장하며 원문은 보관하지 않습니다.</Li>
          </ul>
        </Section>

        <Section title="외부 서비스 이용">
          서비스 운영을 위해 Google Firebase의 Authentication, Firestore, Hosting, Cloud Messaging을 이용합니다.
          수집된 정보는 서비스 제공과 법령상 의무 이행 목적 외에는 임의로 제3자에게 판매하거나 제공하지 않습니다.
        </Section>

        <Section title="문의">
          개인정보 열람·정정·삭제 요청 및 처리 관련 문의는 아래로 연락주세요.
          <p className="mt-2 font-medium text-black">kimjjyun8@gmail.com</p>
        </Section>

      </div>

      <div className="pb-10 text-center">
        <p className="text-[11px] text-gray-200">WordDay © 2026</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-black mb-3">{title}</h2>
      <div className="text-[14px] text-gray-500 leading-relaxed">{children}</div>
    </div>
  );
}

function Li({ children }) {
  return (
    <li className="flex gap-2">
      <span className="text-gray-300 shrink-0 mt-0.5">·</span>
      <span>{children}</span>
    </li>
  );
}
