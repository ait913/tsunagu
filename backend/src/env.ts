import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .default("true"),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().email(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  ADMIN_EMAILS: z.string().default(""),
  OPENAI_API_KEY: z.string().min(1),
  AED_NAVI_CSV_PATH: z.string().min(1),
  EXPO_PUBLIC_API_BASE: z.string().url(),
  EXPO_PUBLIC_WS_BASE: z.string().url(),
  EXPO_PUBLIC_DEMO_NUMBER: z.string().min(1),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = {
  ...parsed.data,
  ADMIN_EMAILS: parsed.data.ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};

export const isAdminEmail = (email: string): boolean =>
  env.ADMIN_EMAILS.includes(email.trim().toLowerCase());
