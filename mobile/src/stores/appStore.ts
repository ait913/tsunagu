import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AppState = {
  demoMode: boolean;
  isOnline: boolean;
  hasOnboarded: boolean;
  theme: "dark";
  toggleDemoMode: (value: boolean) => void;
  setOnline: (value: boolean) => void;
  completeOnboarding: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      demoMode: false,
      isOnline: true,
      hasOnboarded: false,
      theme: "dark",
      toggleDemoMode: (value) => set({ demoMode: value }),
      setOnline: (value) => set({ isOnline: value }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: "tsunagu-app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        demoMode: state.demoMode,
        hasOnboarded: state.hasOnboarded,
      }),
    }
  )
);
