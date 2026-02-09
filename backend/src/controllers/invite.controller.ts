import type { Response } from "express";
import { inviteService } from "../services/invite.service.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";

export class InviteController {
  /**
   * Create invite link
   */
  async createInviteLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { expiresAt, maxUses } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const inviteLink = await inviteService.createInviteLink(
        chatId,
        req.user.id,
        expiresAt ? new Date(expiresAt) : undefined,
        maxUses
      );

      res.status(200).json({
        success: true,
        message: "Invite link created",
        data: inviteLink,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create invite link";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  /**
   * Get invite links for a group
   */
  async getInviteLinks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const links = await inviteService.getInviteLinks(chatId, req.user.id);

      res.status(200).json({
        success: true,
        data: links,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get invite links";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  /**
   * Join group via invite link
   */
  async joinViaInviteLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      if (!code) {
        res.status(400).json({
          success: false,
          message: "Invite code required",
        } as ApiResponse);
        return;
      }

      const chat = await inviteService.joinViaInviteLink(code, req.user.id);

      res.status(200).json({
        success: true,
        message: "Joined group successfully",
        data: chat,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join group";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  /**
   * Revoke invite link
   */
  async revokeInviteLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { linkId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const result = await inviteService.revokeInviteLink(linkId, req.user.id);

      res.status(200).json({
        success: true,
        message: result.message,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke invite link";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }
}

export const inviteController = new InviteController();
