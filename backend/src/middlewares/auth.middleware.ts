import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/type.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../configs/database.js";

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token required",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Attach user to request (without sensitive fields)
    const { password, refreshToken, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
}
