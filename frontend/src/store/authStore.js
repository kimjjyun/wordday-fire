import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,   // { id, name, role, classId? }
      login: (token, user) => set({ token, user }),
      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      logout: () => {
        Promise.all([import('firebase/auth'), import('../firebase')])
          .then(([{ signOut }, { auth }]) => signOut(auth))
          .catch(() => {});
        set({ token: null, user: null });
      },
    }),
    { name: 'wordday-auth' }
  )
);
