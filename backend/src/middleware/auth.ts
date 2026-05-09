import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "jose";

import { prisma } from "../db/client.js";
import { isAdminEmail } from "../env.js";
import { verifyAccessToken } from "../services/jwt.js";
import type { AppBindings, AuthUser } from "../types.js";
import { AppError } from "./error.js";

const extractBearerToken = (value?: string): string => {
  if (!value?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Missing bearer token");
  }
  return value.slice("Bearer ".length);
};

const authUserFromPayload = async (payload: JWTPayload): Promise<AuthUser> => {
  const userId = payload.sub;
  if (!userId) {
    throw new AppError(401, "UNAUTHENTICATED", "Token subject missing");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      currentTier: true,
    },
  });

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "User not found");
  }

  return user;
};

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = extractBearerToken(c.req.header("authorization"));
  const payload = await verifyAccessToken(token);
  const user = await authUserFromPayload(payload);
  c.set("authUser", user);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get("authUser");
  if (!user || !isAdminEmail(user.email)) {
    throw new AppError(403, "FORBIDDEN", "Admin access required");
  }
  await next();
};

export const getAuthUser = (c: Context<AppBindings>): AuthUser => {
  const user = c.get("authUser");
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
  return user;
};
