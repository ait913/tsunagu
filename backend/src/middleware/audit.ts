import type { Context, MiddlewareHandler } from "hono";

import { prisma } from "../db/client.js";
import type { AppBindings, AuditEntry } from "../types.js";

const shouldAuditMethod = (method: string): boolean =>
  method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

export const setAuditEntry = (c: Context<AppBindings>, entry: AuditEntry): void => {
  c.set("auditEntry", entry);
};

export const getClientIp = (headers: Headers): string | null => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return headers.get("x-real-ip");
};

export const auditMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  await next();

  if (!shouldAuditMethod(c.req.method) || c.res.status >= 500) {
    return;
  }

  const auditEntry = c.get("auditEntry");
  if (!auditEntry) {
    return;
  }

  const user = c.get("authUser");
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: auditEntry.action,
      resourceId: auditEntry.resourceId,
      resourceType: auditEntry.resourceType,
      payload: auditEntry.payload as object | undefined,
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: c.req.header("user-agent") ?? null,
    },
  });
};
