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
  async login(data: LoginDTO): Promise<{ user: SafeUser; tokens: AuthTokens }> {
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
    const { password, refreshToken, ...safeUser } = user;

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

  // Update profile
  async updateProfile(
    userId: string,
    data: { name?: string; about?: string; avatar?: string }
  ): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    const { password, refreshToken, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
