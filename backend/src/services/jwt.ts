import { SignJWT, jwtVerify } from "jose";

import { env } from "../env.js";
import { AppError } from "../middleware/error.js";

const encoder = new TextEncoder();
const secret = encoder.encode(env.JWT_SECRET);

type TokenType = "access" | "refresh";

const ttlByType: Record<TokenType, string> = {
  access: "1h",
  refresh: "30d",
};

const signToken = async (userId: string, type: TokenType): Promise<string> =>
  new SignJWT({ type })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ttlByType[type])
    .sign(secret);

export const signAccessToken = async (userId: string): Promise<string> => signToken(userId, "access");

export const signRefreshToken = async (userId: string): Promise<string> => signToken(userId, "refresh");

const verifyToken = async (token: string, expectedType: TokenType) => {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (payload.type !== expectedType) {
      throw new AppError(401, expectedType === "refresh" ? "INVALID_REFRESH" : "UNAUTHENTICATED", "Invalid token type");
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      401,
      expectedType === "refresh" ? "INVALID_REFRESH" : "UNAUTHENTICATED",
      expectedType === "refresh" ? "Invalid refresh token" : "Invalid access token",
    );
  }
};

export const verifyAccessToken = async (token: string) => verifyToken(token, "access");

export const verifyRefreshToken = async (token: string) => verifyToken(token, "refresh");
