import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { AppBindings, AppErrorCode, ErrorPayload } from "../types.js";

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(
    status: ContentfulStatusCode,
    code: AppErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const jsonError = (
  c: Context<AppBindings>,
  status: ContentfulStatusCode,
  code: AppErrorCode,
  message: string,
  details?: unknown,
) => c.json<ErrorPayload>({ error: { code, message, details } }, status);

export const errorMiddleware = async (
  c: Context<AppBindings>,
  next: Next,
): Promise<Response | void> => {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      return jsonError(c, error.status, error.code, error.message, error.details);
    }

    if (error instanceof HTTPException) {
      return jsonError(c, error.status, "INTERNAL", error.message);
    }

    console.error(error);
    return jsonError(c, 500, "INTERNAL", "Internal server error");
  }
};
