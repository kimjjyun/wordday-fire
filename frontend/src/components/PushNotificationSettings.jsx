import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationState,
  showLocalTestNotification,
} from '../api/notifications';
import LoadingDots from './LoadingDots';

export default function PushNotificationSettings({ scope = 'account', compact = false }) {
  const user = useAuthStore(state => state.user);
  const profile = scope === 'solo' && !user ? { role: 'solo' } : (user || {});
  const [state, setState] = useState(() => getNotificationState(scope));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async action => {
    setLoading(true); setMessage('');
    try { await action(); setState(getNotificationState(scope)); }
    catch (error) {
      const blocked = error.code === 'messaging/permission-blocked'
        || error.message?.includes('permission-blocked')
        || error.message?.includes('permission denied');
      setMessage(blocked ? '알림이 차단되어 있습니다. 기기 설정에서 WordDay 알림을 허용해주세요.' : (error.message || '알림 설정을 변경하지 못했습니다.'));
    }
    finally { setLoading(false); }
  };

  const enable = () => run(async () => {
    await enablePushNotifications(profile);
    setMessage('이 기기의 알림을 허용했습니다.');
  });

  const disable = () => run(async () => {
    await disablePushNotifications(scope);
    setMessage('이 기기의 푸시 등록을 해제했습니다.');
  });

  const test = () => run(async () => {
    await showLocalTestNotification();
    setMessage('기기에 테스트 알림을 표시했습니다.');
  });

  return (
    <section>
      {!compact && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-2">푸시 알림</p>}
      <p className={`${compact ? 'text-[12px] mb-3' : 'text-[13px] mb-4'} text-gray-400 font-medium leading-relaxed`}>
        {scope === 'solo'
          ? '학습 알림을 이 기기에서 받을 수 있습니다. 알림은 기기마다 따로 허용해야 합니다.'
          : '시험 초대와 학습 소식을 이 기기에서 받을 수 있습니다. 알림은 기기마다 따로 허용해야 합니다.'}
      </p>

      {state.usesDefaultKey && (
        <p className="text-[12px] bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-3 leading-relaxed">
          현재 Firebase 기본 인증키로 테스트합니다. 운영 전 전용 <b>VITE_FIREBASE_VAPID_KEY</b> 설정을 권장합니다.
        </p>
      )}

      {message && <p className={`${compact ? 'text-[12px]' : 'text-[13px]'} text-center py-2 mb-2`}>{message}</p>}

      {state.hasToken && state.permission === 'granted' ? (
        <div className={compact ? 'grid grid-cols-2 gap-2' : 'space-y-2.5'}>
          <button onClick={test} disabled={loading} className={`${compact ? 'py-2.5 text-[11px]' : 'w-full py-4'} bg-black text-white font-bold rounded-full disabled:opacity-40`}>
            {loading ? <LoadingDots label="처리 중" /> : compact ? '알림 테스트' : '이 기기에서 알림 테스트'}
          </button>
          <button onClick={disable} disabled={loading} className={`${compact ? 'py-2.5 text-[11px] border border-gray-200 rounded-full' : 'w-full py-3 text-[13px]'} text-gray-400 font-bold disabled:opacity-40`}>
            {compact ? '알림 끄기' : '이 기기 알림 해제'}
          </button>
        </div>
      ) : (
        <button onClick={enable} disabled={loading} className={`${compact ? 'px-5 py-2.5 text-[12px]' : 'w-full py-4'} bg-black text-white font-bold rounded-full disabled:opacity-40`}>
          {loading ? <LoadingDots label="설정 중" /> : '알림 허용'}
        </button>
      )}
    </section>
  );
}
