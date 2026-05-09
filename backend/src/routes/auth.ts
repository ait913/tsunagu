import { Hono } from "hono";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { getClientIp, setAuditEntry } from "../middleware/audit.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/jwt.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import type { AppBindings, UserSummary } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Password must contain letters and numbers",
  });

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(1).optional(),
  agreedTermsVersion: z.number().int().positive(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const toUserSummary = (user: {
  id: string;
  email: string;
  displayName: string;
  currentTier: UserSummary["currentTier"];
}): UserSummary => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  currentTier: user.currentTier,
});

router.post("/register", async (c) => {
  const body = parseWithSchema(registerSchema, await c.req.json());
  const email = body.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "Email already taken");
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(body.password),
      displayName: body.displayName,
      phone: body.phone,
      agreedTermsVersion: body.agreedTermsVersion,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      currentTier: true,
    },
  });

  await prisma.consentLog.create({
    data: {
      userId: user.id,
      layer: "ONBOARDING",
      termsVersion: body.agreedTermsVersion,
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: c.req.header("user-agent") ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CONSENT_RECORDED",
      resourceId: user.id,
      resourceType: "User",
      payload: {
        layer: "ONBOARDING",
        termsVersion: body.agreedTermsVersion,
      },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: c.req.header("user-agent") ?? null,
    },
  });

  setAuditEntry(c, {
    action: "USER_REGISTERED",
    resourceId: user.id,
    resourceType: "User",
  });

  return c.json(
    {
      user: toUserSummary(user),
      accessToken: await signAccessToken(user.id),
      refreshToken: await signRefreshToken(user.id),
    },
    201,
  );
});

router.post("/login", async (c) => {
  const body = parseWithSchema(loginSchema, await c.req.json());
  const email = body.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      currentTier: true,
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  setAuditEntry(c, {
    action: "USER_LOGGED_IN",
    resourceId: user.id,
    resourceType: "User",
  });

  return c.json({
    user: toUserSummary(user),
    accessToken: await signAccessToken(user.id),
    refreshToken: await signRefreshToken(user.id),
  });
});

router.post("/refresh", async (c) => {
  const body = parseWithSchema(refreshSchema, await c.req.json());
  const payload = await verifyRefreshToken(body.refreshToken);
  const userId = payload.sub;
  if (!userId) {
    throw new AppError(401, "INVALID_REFRESH", "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new AppError(401, "INVALID_REFRESH", "Invalid refresh token");
  }

  return c.json({
    accessToken: await signAccessToken(user.id),
    refreshToken: await signRefreshToken(user.id),
  });
});

router.post("/logout", requireAuth, async (c) => c.json({ ok: true }));

export default router;
