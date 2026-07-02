import { useEffect, useState } from 'react';
import { isStandaloneDisplayMode } from '../utils/displayMode';

const dismissedKey = 'wordday-install-guide-dismissed';
const isInstalled = () => isStandaloneDisplayMode();

export default function InstallGuide() {
  const [mode, setMode] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInstalled() || sessionStorage.getItem(dismissedKey)) return;
    const ua = navigator.userAgent;
    if (/KAKAOTALK/i.test(ua)) { setMode('kakao'); return; }
    if (/iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) setMode('ios');
    const onPrompt = event => { event.preventDefault(); setPrompt(event); setMode('install'); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const close = () => { sessionStorage.setItem(dismissedKey, '1'); setMode(null); };
  const copy = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); };
  const install = async () => { await prompt?.prompt(); await prompt?.userChoice; close(); };
  if (!mode) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-40 w-[calc(100%-2rem)] max-w-lg bg-white border border-gray-200 shadow-lg rounded-[20px] px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-black text-white font-black flex items-center justify-center shrink-0">W</div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-black tracking-tight">WordDay를 앱처럼 사용하기</p>
          {mode === 'kakao' && <p className="text-[12px] text-gray-500 font-medium mt-1 leading-relaxed">카카오톡 우측 상단 <b>⋯</b> → <b>Safari로 열기</b> 후, 공유 <b>□↑</b> → <b>홈 화면에 추가</b>를 누르세요.</p>}
          {mode === 'ios' && <p className="text-[12px] text-gray-500 font-medium mt-1 leading-relaxed">Safari 공유 <b>□↑</b> → <b>홈 화면에 추가</b>를 누르면 설치됩니다.</p>}
          {mode === 'install' && <p className="text-[12px] text-gray-500 font-medium mt-1">홈 화면에 설치하면 주소 입력 없이 바로 실행할 수 있어요.</p>}
          <div className="flex gap-2 mt-3">
            {mode === 'kakao' && <button onClick={copy} className="bg-black text-white rounded-full px-4 py-2 text-[12px] font-bold">{copied ? '주소 복사됨' : '주소 복사'}</button>}
            {mode === 'install' && <button onClick={install} className="bg-black text-white rounded-full px-4 py-2 text-[12px] font-bold">앱 설치</button>}
            <button onClick={close} className="border border-gray-200 rounded-full px-4 py-2 text-[12px] font-bold text-gray-400">닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
