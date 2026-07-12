import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { joinTest, getLiveTest } from '../../api/tests';

export default function TestWaitingPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [code,   setCode]   = useState('');
  const [joined, setJoined] = useState(false);
  const [error,  setError]  = useState('');
  const [testId, setTestId] = useState('');
  const [joining, setJoining] = useState(false);
  const [waitingError, setWaitingError] = useState('');
  const autoJoinAttemptedRef = useRef(false);

  const rememberTestSession = (roomCode, id) => {
    if (roomCode) sessionStorage.setItem('test_room_code', roomCode);
    if (id) sessionStorage.setItem('test_id', id);
  };

  useEffect(() => {
    if (!joined || !testId) return;
    let stopped = false;
    const check = async () => {
      try {
        const { data } = await getLiveTest(testId);
        if (!stopped && data.status === 'active') {
          sessionStorage.setItem('test_words', JSON.stringify(data.words));
          rememberTestSession(data.roomCode, testId);
          navigate('/student/test/active');
        }
      } catch { if (!stopped) setWaitingError('시험 상태를 확인하지 못했습니다. 자동으로 다시 연결합니다.'); }
    };
    check();
    const timer = setInterval(check, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [joined, testId, navigate]);

  const doJoin = useCallback(async (roomCode) => {
    if (roomCode.length !== 4) { setError('방 코드는 4자리입니다.'); return; }
    setError(''); setJoining(true);
    try {
      const { data } = await joinTest(roomCode);
      setTestId(data.testId);
      rememberTestSession(data.roomCode, data.testId);
      if (data.status === 'active') {
        const { data: liveTest } = await getLiveTest(data.testId);
        sessionStorage.setItem('test_words', JSON.stringify(liveTest.words));
        rememberTestSession(liveTest.roomCode, data.testId);
        navigate('/student/test/active');
        return;
      }
      setJoined(true);
    } catch (err) {
      setError(err.response?.data?.error || '시험에 입장할 수 없습니다.');
    } finally { setJoining(false); }
  }, [navigate]);

  // 초대 모달에서 자동 입장
  useEffect(() => {
    if (autoJoinAttemptedRef.current) return;

    if (location.state?.autoJoin && location.state?.roomCode) {
      autoJoinAttemptedRef.current = true;
      doJoin(location.state.roomCode);
      return;
    }

    const savedRoomCode = sessionStorage.getItem('test_room_code');
    const savedTestId = sessionStorage.getItem('test_id');
    if (savedRoomCode && savedTestId && !joined && !code) {
      autoJoinAttemptedRef.current = true;
      doJoin(savedRoomCode);
    }
  }, [code, doJoin, joined, location.state]);

  const handleJoin = () => doJoin(code.trim().toUpperCase());

  return (
    <Layout title="WORDDAY" back>
      {!joined ? (
        <div className="pt-12 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-3">Together</p>
          <h1 className="text-4xl font-black tracking-tighter mb-2">방 코드 입력</h1>
          <p className="text-[13px] text-gray-300 font-medium mb-8">선생님이 테스트를 시작하면 화면에 코드가 표시돼요</p>

          <input
            className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-center text-3xl font-black tracking-[0.3em] uppercase outline-none focus:border-black transition mb-3"
            maxLength={4}
            placeholder="AB12"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />

          {error && (
            <p className="text-[13px] font-medium text-black text-center mb-4">{error}</p>
          )}

          <p className="text-[12px] text-gray-300 font-medium text-center mb-6">
            선생님이 알려준 4자리 코드를 입력하세요
          </p>

          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-black text-white font-bold py-4 rounded-full text-[15px] tracking-tight active:scale-[0.97] transition disabled:opacity-40"
          >
            {joining ? '입장 중...' : '입장하기'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="flex gap-1.5 justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-black animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-3">Waiting</p>
          <p className="text-3xl font-black tracking-tighter mb-2">참여 완료</p>
          <p className="text-sm text-gray-300 font-medium">선생님이 시작하면 자동으로 넘어가요</p>
          {waitingError && <p className="text-[12px] text-black font-medium mt-4">{waitingError}</p>}
        </div>
      )}
    </Layout>
  );
}
