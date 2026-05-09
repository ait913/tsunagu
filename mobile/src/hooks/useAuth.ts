import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "@/services/api/auth";
import { useAuthStore } from "@/stores/authStore";
import type { LoginReq, RegisterReq } from "@/types/api";

type UseAuthResult = {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (input: LoginReq) => Promise<void>;
  register: (input: RegisterReq) => Promise<void>;
  logout: () => Promise<void>;
};

export function useAuth(): UseAuthResult {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAgreedTermsVersion = useAuthStore(
    (state) => state.setAgreedTermsVersion
  );

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    login: async (input: LoginReq) => {
      const payload = await loginRequest(input);

      setAuth(payload);
    },
    register: async (input: RegisterReq) => {
      const payload = await registerRequest(input);

      setAgreedTermsVersion(input.agreedTermsVersion);
      setAuth(payload);
    },
    logout: async () => {
      try {
        await logoutRequest();
      } finally {
        clearAuth();
      }
    },
  };
}
