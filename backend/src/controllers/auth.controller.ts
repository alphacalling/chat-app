import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validators/auth.validators.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";

export class AuthController {
  //* register user
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validationResult = registerSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          error: validationResult.error.issues[0].message,
        } as ApiResponse);
        return;
      }

      // Register user
      const { user, tokens } = await authService.register(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: { user, tokens },
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
      // Validate input
      const validationResult = loginSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          error: validationResult.error.issues[0].message,
        } as ApiResponse);
        return;
      }

      // Login user
      const { user, tokens } = await authService.login(validationResult.data);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: { user, tokens },
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      res.status(401).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* referesh token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validationResult = refreshTokenSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Refresh token required",
        } as ApiResponse);
        return;
      }

      // Refresh tokens
      const tokens = await authService.refreshTokens(
        validationResult.data.refreshToken
      );

      res.status(200).json({
        success: true,
        message: "Tokens refreshed",
        data: { tokens },
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

      await authService.logout(req.user.id);

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

      res.status(200).json({
        success: true,
        message: "Profile fetched",
        data: { user },
      } as ApiResponse);
    } catch (error) {
      res.status(404).json({
        success: false,
        message: "User not found",
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

      const { name, about, avatar } = req.body;

      const user = await authService.updateProfile(req.user.id, {
        name,
        about,
        avatar,
      });

      res.status(200).json({
        success: true,
        message: "Profile updated",
        data: { user },
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Update failed",
      } as ApiResponse);
    }
  }
}

export const authController = new AuthController();
