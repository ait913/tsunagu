import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
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

// expo-secure-store は Web 未対応 (`setValueWithKeyAsync is not a function`)。
// Web では localStorage、ネイティブでは SecureStore を使う。
const isWeb = Platform.OS === "web";
const webStorage = {
  getItem: async (key: string): Promise<string | null> =>
    typeof window !== "undefined" ? window.localStorage.getItem(key) : null,
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

const secureStorage = isWeb
  ? webStorage
  : {
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

