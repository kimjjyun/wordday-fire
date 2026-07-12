import { useEffect, useState } from 'react';
import PushNotificationSettings from './PushNotificationSettings';
import { syncPushSubscription } from '../api/notifications';
import { useAuthStore } from '../store/authStore';

export default function PushNotificationMenu({ scope = 'account' }) {
  const [open, setOpen] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const profile = scope === 'solo' && !user ? { role: 'solo' } : user;
    if (!profile?.role) return;
    syncPushSubscription(profile).catch(() => {});
  }, [scope, user?.role, user?.id]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="w-8 h-8 shrink-0 rounded-full border border-gray-100 text-gray-500 flex items-center justify-center hover:border-gray-300 hover:text-black transition"
        aria-label="알림 설정"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} aria-label="알림 설정 닫기" />
          <div className="fixed z-50 top-[calc(env(safe-area-inset-top)+3.5rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white border border-gray-200 shadow-xl rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-black tracking-tight">알림 설정</p>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100" aria-label="닫기">×</button>
            </div>
            <PushNotificationSettings scope={scope} compact />
          </div>
        </>
      )}
    </>
  );
}
