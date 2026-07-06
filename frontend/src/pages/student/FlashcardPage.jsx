import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayWords, submitReview } from '../../api/study';
import { useSwipePager } from '../../utils/displayMode';

export default function FlashcardPage() {
  const navigate = useNavigate();
  const [words,   setWords]   = useState([]);
  const [index,   setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done,    setDone]    = useState(false);

  const showMeaning = e => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFlipped(true);
  };

  const hideMeaning = () => setFlipped(false);

  useEffect(() => {
    getTodayWords().then(r => setWords(r.data)).finally(() => setLoading(false));
  }, []);

  const current  = words[index];
  const progress = words.length > 0 ? ((index + 1) / words.length) * 100 : 0;

  const handlePrev = () => {
    if (index === 0) return;
    setIndex(i => i - 1);
    setFlipped(false);
  };

  const handleNext = () => {
    if (current) submitReview({ wordId: current.id, rating: 2 }).catch(() => {});
    if (index + 1 >= words.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
    }
  };

  const { swipeHandlers, swipeStyle } = useSwipePager({
    onNext: handleNext,
    onPrev: handlePrev,
    canNext: index + 1 < words.length,
    canPrev: index > 0,
  });

  // ── 로딩 ─────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white max-w-lg mx-auto">
      <div className="text-center">
        <div className="flex gap-1.5 justify-center mb-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Loading</p>
      </div>
    </div>
  );

  // ── 단어 없음 ──────────────────────────────────────
  if (words.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white max-w-lg mx-auto px-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300 mb-6">Done</p>
      <p className="text-4xl font-black tracking-tighter mb-2">학습 완료</p>
      <p className="text-sm text-gray-400 mb-10">오늘 학습할 단어가 없어요</p>
      <button onClick={() => navigate('/student')} className="bg-black text-white font-bold py-4 px-10 rounded-full text-[15px] tracking-tight">
        홈으로
      </button>
    </div>
  );

  // ── 완료 화면 ──────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex flex-col bg-white max-w-lg mx-auto px-6">
      <div className="flex-1 flex flex-col justify-center pt-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-6">Complete</p>
        <h1 className="text-5xl font-black tracking-tighter leading-none mb-3">학습 완료.</h1>
        <p className="text-sm text-gray-400 font-medium">{words.length}개 단어 학습 완료</p>
      </div>
      <div className="pb-10 space-y-2.5">
        <button
          onClick={() => { setIndex(0); setFlipped(false); setDone(false); }}
          className="w-full bg-black text-white font-bold py-4 rounded-full text-[15px] tracking-tight active:scale-[0.97] transition"
        >다시 보기</button>
        <button
          onClick={() => navigate('/student')}
          className="w-full bg-white text-black border-2 border-black font-bold py-4 rounded-full text-[15px] tracking-tight active:scale-[0.97] transition"
        >홈으로</button>
      </div>
    </div>
  );

  // ── 메인 플래시카드 ───────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white max-w-lg mx-auto overflow-hidden">

      {/* 상단 헤더 */}
      <div className="px-5 safe-area-top pb-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/student')}
          className="text-black font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
        >←</button>
        <div className="flex-1">
          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
            <div
              className="bg-black h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] font-bold text-gray-300 tracking-wider min-w-[40px] text-right">
          {index + 1}/{words.length}
        </span>
      </div>

      {/* 카드 영역 */}
      <div
        className="flex-1 flex flex-col justify-between px-5 pb-8 pt-4"
        style={swipeStyle}
        {...swipeHandlers}
      >

        {/* 위: 영어 / 아래: 누르는 동안 뜻 */}
        <div className="flex-1 flex items-center">
          <div
            key={index}
            className="w-full h-[340px] border border-gray-100 rounded-[28px] overflow-hidden bg-white"
          >
              {/* 윗칸 — 영단어 + 발음기호 */}
              <div className="h-1/2 flex flex-col items-center justify-center px-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-200 mb-6">
                  {current.state === 'new' ? 'New Word' : 'Review'} · {index + 1}/{words.length}
                </p>
                <p className="text-5xl font-black tracking-tighter text-black leading-tight">
                  {current.english}
                </p>
                {current.pronunciation && (
                  <p className="text-[14px] text-gray-300 font-medium mt-3 tracking-wide">
                    {current.pronunciation}
                  </p>
                )}
              </div>

              {/* 아랫칸 — 누르는 동안 한국어 */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`${current.english}의 뜻을 누르는 동안 보기`}
                onPointerDown={showMeaning}
                onPointerUp={hideMeaning}
                onPointerCancel={hideMeaning}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(true); }
                }}
                onKeyUp={e => {
                  if (e.key === 'Enter' || e.key === ' ') setFlipped(false);
                }}
                style={{ touchAction: 'manipulation' }}
                className="relative h-1/2 border-t border-gray-100 flex flex-col items-center justify-center px-8 text-center cursor-pointer select-none bg-gray-50"
              >
                <p className={`absolute text-[12px] font-bold text-gray-300 transition-all duration-300 ${flipped ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                  누르는 동안 뜻 보기
                </p>
                <div aria-hidden={!flipped} className={`transition-all duration-300 ${flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <p className="text-4xl font-black tracking-tighter text-black leading-tight">{current.korean}</p>
                  {current.example && (
                    <p className="text-[11px] text-gray-400 mt-4 leading-relaxed font-medium max-w-[260px]">"{current.example}"</p>
                  )}
                </div>
              </div>
          </div>
        </div>

        {/* 이전 / 다음 버튼 */}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            onClick={handlePrev}
            disabled={index === 0}
            className="py-4 rounded-full font-bold text-[15px] tracking-tight transition active:scale-[0.97]
              bg-white text-black border-2 border-gray-200 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← 이전
          </button>
          <button
            onClick={handleNext}
            className="py-4 rounded-full font-bold text-[15px] tracking-tight transition active:scale-[0.97]
              bg-black text-white"
          >
            {index + 1 >= words.length ? '완료' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
