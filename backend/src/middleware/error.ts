import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import type { AppBindings, AppErrorCode, ErrorPayload } from "../types.js";

export class AppError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const jsonError = (
  c: Context<AppBindings>,
  status: number,
  code: AppErrorCode,
  message: string,
  details?: unknown,
) => c.json<ErrorPayload>({ error: { code, message, details } }, status);

export const errorMiddleware = async (c: Context<AppBindings>, next: Next): Promise<void> => {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      c.res = jsonError(c, error.status, error.code, error.message, error.details);
      return;
    }

    if (error instanceof HTTPException) {
      c.res = jsonError(c, error.status, "INTERNAL", error.message);
      return;
    }

    console.error(error);
    c.res = jsonError(c, 500, "INTERNAL", "Internal server error");
  }
};
