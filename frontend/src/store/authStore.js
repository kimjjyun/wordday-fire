import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,   // { id, name, role, classId? }
      login: (token, user) => set({ token, user }),
      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      logout: async () => {
        try {
          const { disablePushNotifications } = await import('../api/notifications');
          // 푸시 서비스가 응답하지 않아도 계정 전환과 수업 참여는 멈추지 않게 한다.
          await Promise.race([
            disablePushNotifications(),
            new Promise(resolve => setTimeout(resolve, 1200)),
          ]);
        } catch { /* 푸시 해제 실패가 로그아웃을 막지 않도록 한다. */ }
        try {
          const [{ signOut }, { auth }] = await Promise.all([import('firebase/auth'), import('../firebase')]);
          await signOut(auth);
        } catch { /* 로컬 세션은 항상 정리한다. */ }
        set({ token: null, user: null });
      },
    }),
    { name: 'wordday-auth' }
  )
);
