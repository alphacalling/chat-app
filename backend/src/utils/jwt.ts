import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { TokenPayload, AuthTokens } from "../types/type.js";

dotenv.config();

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

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

/** Short-lived token issued only after password is verified at login when TOTP is required. */
export function generateTotpResetToken(userId: string, phone: string): string {
  return jwt.sign(
    { userId, phone, purpose: "totp-reset" },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "5m" },
  );
}

export function verifyTotpResetToken(
  token: string,
): { userId: string; phone: string } | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      userId?: string;
      phone?: string;
      purpose?: string;
    };
    if (
      payload.purpose !== "totp-reset" ||
      !payload.userId ||
      !payload.phone
    ) {
      return null;
    }
    return { userId: payload.userId, phone: payload.phone };
  } catch {
    return null;
  }
}
