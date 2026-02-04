import type { Request, Response } from "express";
import { chatService } from "../services/chat.service.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";

export class ChatController {
  //* Access or Create Chat
  async accessChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const chat = await chatService.accessChat(req.user.id, userId);

      res.status(200).json({
        success: true,
        message: "Chat accessed successfully",
        data: chat,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to access chat";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Fetch All Chats for Current User
  async fetchChats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const chats = await chatService.fetchChats(req.user.id);

      res.status(200).json({
        success: true,
        message: "Chats fetched successfully",
        data: chats,
      } as ApiResponse);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to fetch chats",
      } as ApiResponse);
    }
  }
}

export const chatController = new ChatController();
