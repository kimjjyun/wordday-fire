import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePremiumStore = create(
  persist(
    (set) => ({
      middleSchoolUnlocked: false,
      unlockMiddleSchool: () => set({ middleSchoolUnlocked: true }),
      lockMiddleSchool: () => set({ middleSchoolUnlocked: false }),
    }),
    { name: 'wordday-premium' }
  )
);
