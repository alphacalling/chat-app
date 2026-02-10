import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validators/auth.validators.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";
import { prisma } from "../configs/database.js";
import { saveFile, getFullFileUrl } from "../utils/fileUpload.js";

export class AuthController {
  //* register user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = registerSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          error: validationResult.error.issues[0].message,
        } as ApiResponse);
        return;
      }

      const { user, tokens } = await authService.register(
        validationResult.data,
      );

      // httpOnly cookies for tokens
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
        path: "/",
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: { user },
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = loginSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          error: validationResult.error.issues[0].message,
        } as ApiResponse);
        return;
      }

      const result = await authService.login(validationResult.data);

      if (result.requiresTOTP) {
        res.status(200).json({
          success: true,
          message: "TOTP required",
          data: { user: result.user, requiresTOTP: true },
        } as ApiResponse);
        return;
      }

      // httpOnly cookies for tokens
      res.cookie("accessToken", result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
        path: "/",
      });

      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: { user: result.user },
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      res.status(401).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* search users
  async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { search } = req.query;

      if (!search || typeof search !== "string") {
        res.status(400).json({
          success: false,
          message: "Search query required",
        } as ApiResponse);
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              id: { not: req.user.id },
            },
            {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatar: true,
          about: true,
          isOnline: true,
        },
        take: 10,
      });

      res.status(200).json({
        success: true,
        message: "Users found",
        data: users,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to search users",
      } as ApiResponse);
    }
  }

  //* refresh token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // refresh token
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: "Refresh token required",
        } as ApiResponse);
        return;
      }

      const tokens = await authService.refreshTokens(refreshToken);

      // cookies with new tokens
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
        path: "/",
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({
        success: true,
        message: "Tokens refreshed",
        data: {},
      } as ApiResponse);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      } as ApiResponse);
    }
  }

  //* logout
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      if (req.user) {
        await authService.logout(req.user.id);
      }

      // Clear httpOnly cookies
      res.clearCookie("accessToken", { path: "/" });
      res.clearCookie("refreshToken", { path: "/" });

      res.status(200).json({
        success: true,
        message: "Logout successful",
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Logout failed",
      } as ApiResponse);
    }
  }

  //* getProfile
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const user = await authService.getProfile(req.user.id);
      const baseUrl = req.protocol + "://" + req.get("host");
      const data = {
        ...user,
        avatar: user.avatar ? getFullFileUrl(user.avatar, baseUrl) : user.avatar,
      };

      res.status(200).json({
        success: true,
        message: "Profile fetched",
        data,
      } as ApiResponse);
    } catch (error) {
      res.status(404).json({
        success: false,
        message: "User not found",
      } as ApiResponse);
    }
  }

  //* getUserProfile - Get another user's profile by ID
  async getUserProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        console.error("No authenticated user");
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        console.error("No userId in params");
        res.status(400).json({
          success: false,
          message: "User ID is required",
        } as ApiResponse);
        return;
      }

      console.log("About to call authService.getUserProfile");
      console.log("userId:", userId, "requesterId:", req.user.id);

      const user = await authService.getUserProfile(userId, req.user.id);

      console.log("Profile fetched successfully, sending response");
      res.status(200).json({
        success: true,
        message: "User profile fetched",
        data: user,
      } as ApiResponse);
    } catch (error) {
      console.error(" Error in getUserProfile controller:", error);
      console.error(
        "Error type:",
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        "Error message:",
        error instanceof Error ? error.message : String(error),
      );
      console.error("Full error:", JSON.stringify(error, null, 2));

      const message =
        error instanceof Error ? error.message : "Failed to fetch user profile";

      const statusCode = message.includes("not found")
        ? 404
        : message.includes("Invalid") || message.includes("Use /me/profile")
          ? 400
          : 500;

      console.log(
        "Sending error response with status:",
        statusCode,
        "message:",
        message,
      );
      res.status(statusCode).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* updateProfile
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { name, about, avatar, gender, email } = req.body;

      const user = await authService.updateProfile(req.user.id, {
        name,
        about,
        avatar,
        gender,
        email,
      });
      const baseUrl = req.protocol + "://" + req.get("host");
      const userWithFullAvatar = {
        ...user,
        avatar: user.avatar ? getFullFileUrl(user.avatar, baseUrl) : user.avatar,
      };

      res.status(200).json({
        success: true,
        message: "Profile updated",
        data: { user: userWithFullAvatar },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Update failed",
      } as ApiResponse);
    }
  }

  //* uploadAvatar
  async uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const file = (req as any).file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
        } as ApiResponse);
        return;
      }

      // Validate file type
      if (!file.mimetype.startsWith("image/")) {
        res.status(400).json({
          success: false,
          message: "Only image files are allowed",
        } as ApiResponse);
        return;
      }

      // Save file
      const { fileUrl } = await saveFile(file.buffer, file.originalname, {
        mimeType: file.mimetype,
      });

      // Update user avatar
      const user = await authService.updateProfile(req.user.id, {
        avatar: fileUrl,
      });
      const baseUrl = req.protocol + "://" + req.get("host");
      const userWithFullAvatar = {
        ...user,
        avatar: user.avatar ? getFullFileUrl(user.avatar, baseUrl) : user.avatar,
      };

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        data: { user: userWithFullAvatar },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to upload avatar",
      } as ApiResponse);
    }
  }
}

export const authController = new AuthController();
