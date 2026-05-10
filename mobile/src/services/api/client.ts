import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import type {
  ApiError as ApiErrorResponse,
  RefreshReq,
  RefreshRes,
} from "@/types/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  body?: BodyInit | FormData | Record<string, unknown> | undefined;
  query?: Record<string, QueryValue>;
  multipart?: boolean;
  auth?: boolean;
  demoOverride?: boolean;
};

type JsonRecord = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 10_000;
const REFRESH_PATH = "/auth/refresh";

let refreshPromise: Promise<string | null> | null = null;

function getBaseUrl(): string {
  // Expo は `process.env.EXPO_PUBLIC_*` を build時に literal 値で static 置換する。
  // 動的 (process.env[name]) では置換されないので必ず直接参照する。
  const url = process.env.EXPO_PUBLIC_API_BASE ?? "";
  return url.replace(/\/+$/, "");
}

function buildUrl(
  path: string,
  query?: Record<string, QueryValue>,
  demoOverride?: boolean
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  if (demoOverride || useAppStore.getState().demoMode) {
    params.set("demo", "true");
  }

  const suffix = params.toString();
  return `${getBaseUrl()}${normalizedPath}${suffix ? `?${suffix}` : ""}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

function extractErrorPayload(payload: unknown): ApiErrorResponse["error"] | null {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const error = payload.error as JsonRecord;

    return {
      code:
        typeof error.code === "string" ? error.code : "INTERNAL",
      message:
        typeof error.message === "string"
          ? error.message
          : "Request failed",
      details: error.details,
    };
  }

  return null;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "Request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken, clearAuth } = useAuthStore.getState();

    if (!refreshToken) {
      clearAuth();
      return null;
    }

    try {
      const url = buildUrl(REFRESH_PATH);
      const response = await requestWithTimeout(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken } satisfies RefreshReq),
      });
      const payload = await parseResponseBody(response);

      if (!response.ok) {
        clearAuth();
        return null;
      }

      const data = payload as RefreshRes;

      useAuthStore.setState((state) => ({
        ...state,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }));

      return data.accessToken;
    } catch {
      clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function requestInternal<T>(
  method: HttpMethod,
  path: string,
  opts: RequestOptions,
  hasRetried: boolean
): Promise<T> {
  const url = buildUrl(path, opts.query, opts.demoOverride);
  const shouldAuth = opts.auth !== false;
  const token = shouldAuth ? useAuthStore.getState().accessToken : null;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;

  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    if (opts.multipart) {
      body = opts.body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const response = await requestWithTimeout(url, {
    method,
    headers,
    body,
  });
  const payload = await parseResponseBody(response);

  if (response.status === 401 && shouldAuth && !hasRetried) {
    const nextToken = await refreshAccessToken();

    if (nextToken) {
      return requestInternal<T>(method, path, opts, true);
    }
  }

  if (!response.ok) {
    const error = extractErrorPayload(payload);

    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL",
      error?.message ?? "Request failed",
      error?.details
    );
  }

  return payload as T;
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  return requestInternal<T>(method, path, opts, false);
}

