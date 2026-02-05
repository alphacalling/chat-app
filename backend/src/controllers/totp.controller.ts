import type { Request, Response } from "express";
import { totpService } from "../services/totp.service.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";

export class TOTPController {
  /**
   * Generate TOTP secret and QR code
   */
  async generateTOTP(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const result = await totpService.enableTOTP(req.user.id);

      res.status(200).json({
        success: true,
        message: "TOTP secret generated",
        data: result,
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate TOTP";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  /**
   * Verify and enable TOTP
   */
  async verifyAndEnableTOTP(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: "TOTP token required",
        } as ApiResponse);
        return;
      }

      await totpService.verifyAndEnableTOTP(req.user.id, token);

      res.status(200).json({
        success: true,
        message: "TOTP enabled successfully",
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enable TOTP";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  /**
   * Disable TOTP
   */
  async disableTOTP(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: "TOTP token required",
        } as ApiResponse);
        return;
      }

      await totpService.disableTOTP(req.user.id, token);

      res.status(200).json({
        success: true,
        message: "TOTP disabled successfully",
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disable TOTP";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }
}

export const totpController = new TOTPController();
