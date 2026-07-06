import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGuestStore } from '../../store/guestStore';
import { CATEGORIES, RECOMMENDED_WORDS, TOTAL_DAYS } from '../../data/recommendedWords';
import { SOLO_PACKS, getSoloPack, loadSoloPackWords } from '../../data/soloPacks';
import { usePremiumStore } from '../../store/premiumStore';
import { trackVisit } from '../../api/stats';

const DAYS_EN = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SoloHome() {
  const { exit } = useGuestStore();
  const navigate = useNavigate();
  const middleUnlocked = usePremiumStore(state => state.middleSchoolUnlocked);
  const unlockMiddleSchool = usePremiumStore(state => state.unlockMiddleSchool);
  const [showAll, setShowAll] = useState(false);
  const [selectedPack, setSelectedPack] = useState('recommended');
  const [catFilter, setCatFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState(0);
  const [modal, setModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [packWords, setPackWords] = useState(RECOMMENDED_WORDS);
  const [packLoading, setPackLoading] = useState(false);

  const now = new Date();
  const dayEn = DAYS_EN[now.getDay()];
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => { trackVisit('guest'); }, []);

  useEffect(() => {
    let alive = true;
    if (selectedPack === 'recommended') {
      setPackWords(RECOMMENDED_WORDS);
      setPackLoading(false);
      return () => { alive = false; };
    }

    setPackLoading(true);
    loadSoloPackWords(selectedPack)
      .then(words => {
        if (!alive) return;
        setPackWords(words);
        setPackLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setPackWords([]);
        setPackLoading(false);
      });

    return () => { alive = false; };
  }, [selectedPack]);

  useEffect(() => {
    if (selectedPack === 'middle' && !middleUnlocked) {
      setSelectedPack('recommended');
    }
  }, [middleUnlocked, selectedPack]);

  const currentPack = getSoloPack(selectedPack);

  const filteredWords = useMemo(() => {
    return packWords.filter(w => {
      if (selectedPack === 'recommended' && catFilter !== 'all' && w.category !== catFilter) return false;
      if (dayFilter !== 0 && w.day !== dayFilter) return false;
      return true;
    });
  }, [packWords, selectedPack, catFilter, dayFilter]);

  const PREVIEW = 5;
  const visible = showAll ? filteredWords : filteredWords.slice(0, PREVIEW);
  const remaining = Math.max(0, filteredWords.length - PREVIEW);

  const openPack = (packId) => {
    const pack = getSoloPack(packId);
    if (pack.hidden && !middleUnlocked) {
      setPayModal(packId);
      return;
    }
    setSelectedPack(packId);
    setCatFilter('all');
    setDayFilter(0);
    setShowAll(false);
  };

  const confirmMockPayment = () => {
    unlockMiddleSchool();
    setPayModal(null);
    setSelectedPack('middle');
    setCatFilter('all');
    setDayFilter(0);
    setShowAll(false);
  };

  const startFlashcard = (day) => {
    setModal(null);
    navigate('/solo/flashcard', { state: { packId: selectedPack, category: catFilter, day: day ?? 0 } });
  };

  const startQuiz = (day) => {
    setModal(null);
    navigate('/solo/quiz', { state: { packId: selectedPack, category: catFilter, day: day ?? 0 } });
  };

  const totalCount = currentPack.wordCount;
  const totalDays = currentPack.totalDays;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 safe-area-top pb-3 flex items-center">
        <h1 className="flex-1 font-black text-[15px] tracking-tight">WORDDAY</h1>
        <button
          onClick={() => { exit(); navigate('/login'); }}
          className="text-[11px] text-gray-300 hover:text-black transition font-medium"
        >나가기</button>
      </div>
      <div className="h-px bg-gray-100" />

      <div className="flex-1 px-5 py-4 pb-10">
        <div className="pt-2 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-1">{dateStr}</p>
          <h1 className="text-5xl font-black tracking-tighter text-black leading-none">{dayEn}</h1>
          <p className="text-[12px] text-gray-300 font-medium mt-3">
            총 <span className="text-black font-bold">{totalCount}</span>개 단어 · {totalDays}일 과정
          </p>
        </div>

        <div className="h-px bg-gray-100 mb-5" />

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">Word Packs</p>
            <button
              type="button"
              onClick={() => openPack('recommended')}
              className="text-[11px] font-bold text-gray-300 hover:text-black transition"
            >
              기본 팩으로
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {SOLO_PACKS.map(pack => {
              const active = selectedPack === pack.id;
              const locked = pack.hidden && !middleUnlocked;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => openPack(pack.id)}
                  className={`w-full text-left rounded-[22px] border px-4 py-4 transition ${
                    active ? 'border-black bg-black text-white' : 'border-gray-100 bg-white text-black'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-[15px] font-black tracking-tight ${active ? 'text-white' : 'text-black'}`}>{pack.title}</p>
                      <p className={`text-[11px] mt-1 font-medium ${active ? 'text-white/75' : 'text-gray-300'}`}>{pack.subtitle}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${
                      active ? 'bg-white text-black' : locked ? 'bg-gray-50 text-gray-300' : 'bg-black text-white'
                    }`}>
                      {locked ? '결제 필요' : pack.badge}
                    </span>
                  </div>
                  <div className={`mt-3 flex items-center justify-between text-[11px] font-bold ${active ? 'text-white/75' : 'text-gray-300'}`}>
                    <span>{pack.wordCount}개</span>
                    <span>{pack.totalDays}일 · 하루 {pack.wordsPerDay}개</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedPack === 'recommended' && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[{ key: 'all', label: '전체' }, ...CATEGORIES].map(c => (
              <button key={c.key} onClick={() => { setCatFilter(c.key); setShowAll(false); }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                  catFilter === c.key ? 'bg-black text-white' : 'border border-gray-200 text-gray-400 hover:border-gray-400'
                }`}
              >{c.label}</button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 shrink-0">DAY</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => { setDayFilter(0); setShowAll(false); }}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                dayFilter === 0 ? 'bg-black text-white' : 'border border-gray-200 text-gray-400 hover:border-gray-400'
              }`}
            >전체</button>
            {[...Array(totalDays)].map((_, i) => (
              <button key={i + 1} onClick={() => { setDayFilter(i + 1); setShowAll(false); }}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                  dayFilter === i + 1 ? 'bg-black text-white' : 'border border-gray-200 text-gray-400 hover:border-gray-400'
                }`}
              >{i + 1}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">Words</p>
          <span className="text-[11px] font-bold text-gray-300">{filteredWords.length}개</span>
        </div>

        {packLoading ? (
          <div className="py-12 text-center">
            <p className="text-2xl font-black tracking-tighter mb-1">불러오는 중</p>
            <p className="text-sm text-gray-300">선택한 팩을 준비하고 있어요</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-2xl font-black tracking-tighter mb-1">단어 없음</p>
            <p className="text-sm text-gray-300">필터를 바꿔보세요</p>
          </div>
        ) : (
          <>
            {visible.map((w, i) => (
              <div key={w.no}>
                <div className="flex items-baseline justify-between py-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[10px] font-bold text-gray-200 w-8 text-right shrink-0">{w.no}</span>
                    <span className="font-bold text-[15px] text-black tracking-tight">{w.english}</span>
                  </div>
                  <span className="text-[13px] text-gray-400 font-medium ml-3 shrink-0">{w.korean}</span>
                </div>
                {i < visible.length - 1 && <div className="h-px bg-gray-50" />}
              </div>
            ))}

            {(remaining > 0 || showAll) && (
              <button onClick={() => setShowAll(v => !v)}
                className="w-full flex items-center justify-between border border-gray-100 rounded-full px-5 py-3 mt-3 hover:border-gray-300 transition"
              >
                <span className="text-[13px] font-medium text-gray-400">
                  {showAll ? '접기' : `+${remaining}개 더 보기`}
                </span>
                <span className="text-gray-400 text-sm">{showAll ? '−' : '+'}</span>
              </button>
            )}

            <div className="space-y-2.5 mt-5">
              <button
                onClick={() => setModal('flashcard')}
                className="w-full bg-black text-white font-bold py-4 rounded-full text-[15px] tracking-tight active:scale-[0.97] transition"
              >암기하기</button>
              <button
                onClick={() => setModal('quiz')}
                className="w-full bg-white text-black border-2 border-black font-bold py-4 rounded-full text-[15px] tracking-tight active:scale-[0.97] transition"
              >퀴즈 풀기</button>
            </div>
          </>
        )}
      </div>

      {showAll && filteredWords.length > PREVIEW && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-11 h-11 rounded-full bg-black text-white shadow-lg flex items-center justify-center text-lg active:scale-90 transition"
            aria-label="맨 위로"
          >↑</button>
          <button
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            className="w-11 h-11 rounded-full bg-black text-white shadow-lg flex items-center justify-center text-lg active:scale-90 transition"
            aria-label="맨 아래로"
          >↓</button>
          <button
            onClick={() => { setShowAll(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="w-11 h-11 rounded-full bg-white border border-gray-200 text-gray-500 shadow-lg flex items-center justify-center text-[11px] font-bold active:scale-90 transition"
            aria-label="접기"
          >접기</button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[28px] px-5 pt-5 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-4">
              {modal === 'flashcard' ? '암기하기' : '퀴즈 풀기'} — DAY 선택
            </p>
            <div className="space-y-2">
              <button
                onClick={() => modal === 'flashcard' ? startFlashcard(0) : startQuiz(0)}
                className="w-full text-left px-4 py-3.5 rounded-2xl bg-black text-white font-bold text-[14px] tracking-tight"
              >
                전체 ({filteredWords.length}개)
              </button>
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {[...Array(totalDays)].map((_, i) => {
                  const d = i + 1;
                  const cnt = packWords.filter(w => w.day === d && (selectedPack === 'recommended' ? (catFilter === 'all' || w.category === catFilter) : true)).length;
                  if (cnt === 0) return null;
                  return (
                    <button key={d}
                      onClick={() => modal === 'flashcard' ? startFlashcard(d) : startQuiz(d)}
                      className="py-3 rounded-2xl border-2 border-gray-100 hover:border-black font-bold text-[13px] transition text-center"
                    >
                      <span className="block text-black">DAY {d}</span>
                      <span className="block text-[10px] text-gray-300 font-medium">{cnt}개</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setPayModal(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[28px] px-5 pt-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-2">Mock Checkout</p>
            <h2 className="text-2xl font-black tracking-tighter leading-tight">중학 필수 영단어 1800</h2>
            <p className="text-[13px] text-gray-400 font-medium mt-2">
              실제 결제는 아닙니다. 테스트로 결제하기를 누르면 바로 잠금이 해제됩니다.
            </p>
            <div className="mt-5 rounded-[22px] border border-gray-100 bg-gray-50 px-4 py-4">
              <div className="flex items-center justify-between text-[13px] font-bold">
                <span>테스트 결제</span>
                <span>0원</span>
              </div>
              <p className="text-[11px] text-gray-300 font-medium mt-1">새로고침해도 잠금 상태는 유지됩니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                onClick={() => setPayModal(null)}
                className="w-full border border-gray-200 text-gray-400 font-bold py-4 rounded-full text-[15px]"
              >
                취소
              </button>
              <button
                onClick={confirmMockPayment}
                className="w-full bg-black text-white font-bold py-4 rounded-full text-[15px]"
              >
                결제하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-6 pt-2 text-center flex items-center justify-center gap-3">
        <Link to="/guide" className="text-[11px] text-gray-200 hover:text-gray-400 transition">학습 가이드</Link>
        <span className="text-gray-100">·</span>
        <Link to="/privacy" className="text-[11px] text-gray-200 hover:text-gray-400 transition">개인정보처리방침</Link>
      </div>
    </div>
  );
}
