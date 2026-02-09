import type { Response } from "express";
import { blockService } from "../services/block.service.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";

export class BlockController {

// Block a user
  async blockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID required",
        } as ApiResponse);
        return;
      }

      await blockService.blockUser(req.user.id, userId);

      res.status(200).json({
        success: true,
        message: "User blocked successfully",
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to block user";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

 // Unblock a user
  async unblockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID required",
        } as ApiResponse);
        return;
      }

      await blockService.unblockUser(req.user.id, userId);

      res.status(200).json({
        success: true,
        message: "User unblocked successfully",
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unblock user";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }


  // Get blocked users
  async getBlockedUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const blocked = await blockService.getBlockedUsers(req.user.id);

      res.status(200).json({
        success: true,
        data: blocked,
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get blocked users";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }
}

export const blockController = new BlockController();
