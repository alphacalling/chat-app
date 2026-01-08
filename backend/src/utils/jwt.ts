import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { TokenPayload, AuthTokens } from "../types/type.js";

dotenv.config();

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}
