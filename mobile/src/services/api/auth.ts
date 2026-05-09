import { request } from "@/services/api/client";
import type {
  LoginReq,
  LoginRes,
  LogoutRes,
  RefreshRes,
  RegisterReq,
  RegisterRes,
} from "@/types/api";

export function register(req: RegisterReq): Promise<RegisterRes> {
  return request<RegisterRes>("POST", "/auth/register", {
    body: req,
    auth: false,
  });
}

export function login(req: LoginReq): Promise<LoginRes> {
  return request<LoginRes>("POST", "/auth/login", {
    body: req,
    auth: false,
  });
}

export function refresh(refreshToken: string): Promise<RefreshRes> {
  return request<RefreshRes>("POST", "/auth/refresh", {
    body: { refreshToken },
    auth: false,
  });
}

export function logout(): Promise<LogoutRes> {
  return request<LogoutRes>("POST", "/auth/logout");
}

