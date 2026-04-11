import { prisma } from "../configs/database.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateTokens, verifyRefreshToken } from "../utils/jwt.js";
import { encrypt, decrypt, isEncrypted } from "../utils/encryption.js";
import { blockService } from "./block.service.js";
import type {
  RegisterDTO,
  LoginDTO,
  SafeUser,
  AuthTokens,
} from "../types/type.js";

export class AuthService {
  //* register user
  async register(
    data: RegisterDTO,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) {
      throw new Error("Phone number already registered");
    }

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

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: encrypt(tokens.refreshToken) },
    });

    const { password, refreshToken, totpSecret, totpBackupCodes, ...safeUser } =
      user;

    return { user: safeUser, tokens };
  }

  //* Login user
  async login(
    data: LoginDTO & { totpToken?: string },
  ): Promise<{ user: SafeUser; tokens: AuthTokens; requiresTOTP?: boolean }> {
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
        const {
          password,
          refreshToken,
          totpSecret,
          totpBackupCodes,
          ...safeUser
        } = user;
        return { user: safeUser, tokens: {} as AuthTokens, requiresTOTP: true };
      }

      const { verifyTOTP, verifyBackupCode } = await import("../utils/totp.js");

      const totpSecret = user.totpSecret
        ? isEncrypted(user.totpSecret)
          ? decrypt(user.totpSecret)
          : user.totpSecret
        : null;

      const backupCodes = user.totpBackupCodes
        ? isEncrypted(user.totpBackupCodes)
          ? decrypt(user.totpBackupCodes)
          : user.totpBackupCodes
        : null;

      let totpValid = totpSecret
        ? verifyTOTP(data.totpToken, totpSecret)
        : false;

      if (!totpValid && backupCodes) {
        const result = verifyBackupCode(data.totpToken, backupCodes);
        if (result.valid) {
          totpValid = true;
          await prisma.user.update({
            where: { id: user.id },
            data: { totpBackupCodes: encrypt(result.remainingCodes) },
          });
        }
      }

      if (!totpValid) {
        throw new Error("Invalid TOTP token");
      }
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: encrypt(tokens.refreshToken),
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    const { password, refreshToken, totpSecret, totpBackupCodes, ...safeUser } =
      user;

    return { user: safeUser, tokens };
  }

  async refreshTokens(oldRefreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(oldRefreshToken);

    if (!payload) {
      throw new Error("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.refreshToken) {
      throw new Error("Invalid refresh token");
    }

    // Decrypt stored token for comparison
    let storedToken: string;
    try {
      storedToken = isEncrypted(user.refreshToken)
        ? decrypt(user.refreshToken)
        : user.refreshToken;
    } catch {
      throw new Error("Invalid refresh token");
    }

    if (storedToken !== oldRefreshToken) {
      throw new Error("Invalid refresh token");
    }

    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: encrypt(tokens.refreshToken) },
    });

    return tokens;
  }

  //* Logout user
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

  //* Get user profile
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { password, refreshToken, totpSecret, totpBackupCodes, ...safeUser } =
      user;
    return safeUser;
  }

  //* getUserProfile
  async getUserProfile(userId: string, requesterId: string): Promise<SafeUser> {
    if (!userId || userId.trim() === "") {
      throw new Error("Invalid user ID");
    }

    if (userId === requesterId) {
      throw new Error("Use /me/profile endpoint to view your own profile");
    }

    const blocked =
      (await blockService.isBlocked(requesterId, userId)) ||
      (await blockService.isBlocked(userId, requesterId));
    if (blocked) {
      throw new Error("User not found");
    }

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

    if (!user) {
      throw new Error("User not found");
    }

    const userWithGender = {
      ...user,
      gender: null as string | null,
    };

    return userWithGender as SafeUser;
  }

  //* forgotPassword
  async forgotPassword(phone: string): Promise<{ totpEnabled: boolean }> {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new Error(
        "Password reset is not available for this account. Ensure Two-Factor Authentication is enabled.",
      );
    }

    return { totpEnabled: true };
  }

  //* Reset password — step 2: verify TOTP + set new password
  async resetPassword(
    phone: string,
    totpToken: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new Error("No account found with this phone number");
    }

    if (!user.totpEnabled || !user.totpSecret) {
      throw new Error("TOTP is not enabled on this account");
    }

    const { verifyTOTP, verifyBackupCode } = await import("../utils/totp.js");

    const secret = isEncrypted(user.totpSecret)
      ? decrypt(user.totpSecret)
      : user.totpSecret;

    const backupCodes = user.totpBackupCodes
      ? isEncrypted(user.totpBackupCodes)
        ? decrypt(user.totpBackupCodes)
        : user.totpBackupCodes
      : null;

    let totpValid = verifyTOTP(totpToken, secret);
    let updatedBackupCodes: string | null = null;

    if (!totpValid && backupCodes) {
      const result = verifyBackupCode(totpToken, backupCodes);
      if (result.valid) {
        totpValid = true;
        updatedBackupCodes = result.remainingCodes;
      }
    }

    if (!totpValid) {
      throw new Error("Invalid TOTP token");
    }

    const hashedPassword = await hashPassword(newPassword);

    const updateData: any = {
      password: hashedPassword,
      refreshToken: null,
    };
    if (updatedBackupCodes !== null) {
      updateData.totpBackupCodes = encrypt(updatedBackupCodes);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  //* Update profile
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      about?: string;
      avatar?: string;
      gender?: string;
      email?: string;
    },
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

    const { password, refreshToken, totpSecret, totpBackupCodes, ...safeUser } =
      user;
    return safeUser;
  }
}

export const authService = new AuthService();
