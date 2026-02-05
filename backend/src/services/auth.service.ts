import { prisma } from "../configs/database.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateTokens, verifyRefreshToken } from "../utils/jwt.js";
import type {
  RegisterDTO,
  LoginDTO,
  SafeUser,
  AuthTokens,
} from "../types/type.js";

export class AuthService {
  // Register new user
  async register(
    data: RegisterDTO
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) {
      throw new Error("Phone number already registered");
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new Error("Email already registered");
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
    });

    // Save refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    // Return user without sensitive fields
    const { password, refreshToken, ...safeUser } = user;

    return { user: safeUser, tokens };
  }

  // Login user
  async login(data: LoginDTO & { totpToken?: string }): Promise<{ user: SafeUser; tokens: AuthTokens; requiresTOTP?: boolean }> {
    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (!user) {
      throw new Error("Invalid phone or password");
    }

    // Verify password
    const isValid = await comparePassword(data.password, user.password);

    if (!isValid) {
      throw new Error("Invalid phone or password");
    }

    // Check if TOTP is enabled
    if (user.totpEnabled) {
      if (!data.totpToken) {
        // Return requires TOTP flag
        const { password, refreshToken, totpSecret, totpBackupCodes, ...safeUser } = user;
        return { user: safeUser, tokens: {} as AuthTokens, requiresTOTP: true };
      }

      // Verify TOTP token
      const { verifyTOTP, verifyBackupCode } = await import("../utils/totp.js");
      const totpValid = user.totpSecret && (
        verifyTOTP(data.totpToken, user.totpSecret) ||
        (user.totpBackupCodes && verifyBackupCode(data.totpToken, user.totpBackupCodes))
      );

      if (!totpValid) {
        throw new Error("Invalid TOTP token");
      }
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
    });

    // Update refresh token and online status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    // Return user without sensitive fields
    const { password, refreshToken, totpSecret, totpBackupCodes, ...safeUser } = user;

    return { user: safeUser, tokens };
  }

  // Refresh tokens
  async refreshTokens(oldRefreshToken: string): Promise<AuthTokens> {
    // Verify old refresh token
    const payload = verifyRefreshToken(oldRefreshToken);

    if (!payload) {
      throw new Error("Invalid refresh token");
    }

    // Find user and check if refresh token matches
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new Error("Invalid refresh token");
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
    });

    // Update refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return tokens;
  }

  // Logout user
  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        isOnline: false,
        lastSeen: new Date(),
      },
    });
  }

  // Get user profile
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { password, refreshToken, ...safeUser } = user;
    return safeUser;
  }

  // Get another user's profile (public info only)
  async getUserProfile(userId: string, requesterId: string): Promise<SafeUser> {
    console.log("🔍🔍🔍 getUserProfile service called");
    console.log("🔍 userId:", userId);
    console.log("🔍 requesterId:", requesterId);
    
    if (!userId || userId.trim() === "") {
      console.error("❌ Invalid userId provided:", userId);
      throw new Error("Invalid user ID");
    }

    // Don't allow viewing your own profile through this endpoint (use /me/profile instead)
    if (userId === requesterId) {
      console.log("⚠️ User trying to view own profile via /user/:userId endpoint");
      throw new Error("Use /me/profile endpoint to view your own profile");
    }

    console.log("🔍 Querying database for user:", userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        about: true,
        gender: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    console.log("🔍 User found:", user ? "YES" : "NO");
    if (user) {
      console.log("🔍 User name:", user.name);
    }

    if (!user) {
      console.error("❌ User not found in database for userId:", userId);
      throw new Error("User not found");
    }

    const userWithGender = {
      ...user,
      gender: null as string | null,
    };

    console.log("✅✅✅ User profile retrieved successfully - NO BLOCK CHECK");
    return userWithGender as SafeUser;
  }

  // Update profile
  async updateProfile(
    userId: string,
    data: { name?: string; about?: string; avatar?: string; gender?: string; email?: string }
  ): Promise<SafeUser> {
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error("Email already in use");
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    const { password, refreshToken, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
