import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RECOMMENDED_WORDS } from '../../data/recommendedWords';
import { useSwipePager } from '../../utils/displayMode';

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function SoloFlashcard() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const words = useMemo(() => {
    const cat = state?.category ?? 'all';
    const day = state?.day ?? 0;
    return RECOMMENDED_WORDS.filter(w => {
      if (cat !== 'all' && w.category !== cat) return false;
      if (day !== 0 && w.day !== day) return false;
      return true;
    });
  }, []);

  const [index,   setIndex]   = useState(state?.startIndex ?? 0);
  const [flipped, setFlipped] = useState(false);

  const showMeaning = e => {
    if (e.target.closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFlipped(true);
  };

  const hideMeaning = e => {
    if (e.target.closest('button')) return;
    setFlipped(false);
  };

  const current = words[index];
  const progress = words.length > 0 ? ((index + 1) / words.length) * 100 : 0;

  const goNext = useCallback(() => {
    if (index + 1 >= words.length) { navigate('/solo'); return; }
    setIndex(i => i + 1);
    setFlipped(false);
  }, [index, words.length, navigate]);

  const goPrev = useCallback(() => {
    if (index === 0) return;
    setIndex(i => i - 1);
    setFlipped(false);
  }, [index]);

  const { swipeHandlers, swipeStyle } = useSwipePager({
    onNext: goNext,
    onPrev: goPrev,
    canNext: index + 1 < words.length,
    canPrev: index > 0,
  });

  if (words.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white max-w-lg mx-auto px-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300 mb-4">Empty</p>
      <p className="text-3xl font-black tracking-tighter mb-6">단어가 없어요</p>
      <button onClick={() => navigate('/solo')} className="bg-black text-white font-bold py-4 px-10 rounded-full text-[15px]">홈으로</button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white max-w-lg mx-auto overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 safe-area-top pb-3 flex items-center gap-4">
        <button onClick={() => navigate('/solo')} className="text-black font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">←</button>
        <div className="flex-1">
          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
            <div className="bg-black h-1 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-[11px] font-bold text-gray-300 tracking-wider min-w-[40px] text-right">{index + 1}/{words.length}</span>
      </div>

      {/* 카드 */}
      <div
        className="flex-1 flex flex-col justify-between px-5 pb-8 pt-4"
        style={swipeStyle}
        {...swipeHandlers}
      >
        <div className="flex-1 flex items-center">
          <div key={index} className="w-full h-[340px] border border-gray-100 rounded-[28px] overflow-hidden bg-white">
              {/* 윗칸 — 영어 */}
              <div className="h-1/2 flex flex-col items-center justify-center px-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-200 mb-2">
                  No.{current.no} · DAY {current.day}
                </p>
                <p className="text-5xl font-black tracking-tighter text-black leading-tight mt-2">{current.english}</p>
                <button
                  onClick={e => { e.stopPropagation(); speak(current.english); }}
                  className="mt-4 w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 transition text-gray-400 hover:text-black"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                    <path d="M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4L3 8l4 4V4zm0-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1l4-4V4L7 0h-.001A1 1 0 0 0 7 3z"/>
                  </svg>
                </button>
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

        {/* 이전 / 다음 */}
        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="py-4 rounded-full font-bold text-[15px] tracking-tight border-2 border-black text-black transition active:scale-[0.97] disabled:border-gray-200 disabled:text-gray-300"
          >← 이전</button>
          <button
            onClick={goNext}
            className="py-4 rounded-full font-bold text-[15px] tracking-tight bg-black text-white transition active:scale-[0.97]"
          >{index + 1 >= words.length ? '완료' : '다음 →'}</button>
        </div>
      </div>
    </div>
  );
}
