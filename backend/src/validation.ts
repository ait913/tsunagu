import type { ZodType } from "zod";

import { AppError } from "./middleware/error.js";

export const parseWithSchema = <T>(schema: ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION", "Validation failed", parsed.error.flatten());
  }
  return parsed.data;
};
