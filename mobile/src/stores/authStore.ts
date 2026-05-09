import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthPayload, Tier, UserSummary } from "@/types/api";

type AuthState = {
  user: UserSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  agreedTermsVersion: number | null;
  finderOnlyMode: boolean;
  isAuthenticated: () => boolean;
  setAuth: (payload: AuthPayload) => void;
  clearAuth: () => void;
  setTier: (tier: Tier | null) => void;
  setAgreedTermsVersion: (version: number | null) => void;
  setFinderOnlyMode: (value: boolean) => void;
};

const secureStorage = {
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) =>
    SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
};

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  agreedTermsVersion: null,
  finderOnlyMode: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      isAuthenticated: () => Boolean(get().user && get().accessToken),
      setAuth: (payload) =>
        set({
          user: payload.user,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        }),
      clearAuth: () => set({ ...initialState }),
      setTier: (tier) =>
        set((state) => ({
          user: state.user ? { ...state.user, currentTier: tier } : null,
        })),
      setAgreedTermsVersion: (version) => set({ agreedTermsVersion: version }),
      setFinderOnlyMode: (value) => set({ finderOnlyMode: value }),
    }),
    {
      name: "tsunagu-auth",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

