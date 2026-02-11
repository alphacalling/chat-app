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

  //* Create Group Chat
  async createGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { name, userIds } = req.body;

      if (!name || !userIds || !Array.isArray(userIds)) {
        res.status(400).json({
          success: false,
          message: "Group name and user IDs array required",
        } as ApiResponse);
        return;
      }

      const group = await chatService.createGroupChat(
        req.user.id,
        name,
        userIds
      );

      // Notify participants in real-time that group is created
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          const participantIds =
            group.users?.map((u: { id: string }) => u.id) ?? [];

          io.emit("group:created", {
            chatId: group.id,
            participants: participantIds,
            group,
          });
        }
      } catch (socketError) {
        console.error("Failed to emit group:created event:", socketError);
      }

      res.status(201).json({
        success: true,
        message: "Group created successfully",
        data: group,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create group";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Rename Group
  async renameGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { chatId, name } = req.body;

      if (!chatId || !name) {
        res.status(400).json({
          success: false,
          message: "Chat ID and new name required",
        } as ApiResponse);
        return;
      }

      const group = await chatService.renameGroupChat(
        chatId,
        req.user.id,
        name
      );

      // Broadcast group update (e.g., name change)
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          io.to(`chat:${chatId}`).emit("group:updated", {
            chatId,
            group,
            updatedBy: req.user.id,
            type: "name",
          });
        }
      } catch (socketError) {
        console.error("Failed to emit group:updated (name) event:", socketError);
      }

      res.status(200).json({
        success: true,
        message: "Group renamed successfully",
        data: group,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rename group";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Add User to Group
  async addToGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { chatId, userId } = req.body;

      if (!chatId || !userId) {
        res.status(400).json({
          success: false,
          message: "Chat ID and user ID required",
        } as ApiResponse);
        return;
      }

      const group = await chatService.addUserToGroup(
        chatId,
        req.user.id,
        userId
      );

      // Notify about user being added to group
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          io.to(`chat:${chatId}`).emit("group:user-added", {
            chatId,
            userId,
            addedBy: req.user.id,
            group,
          });
        }
      } catch (socketError) {
        console.error("Failed to emit group:user-added event:", socketError);
      }

      res.status(200).json({
        success: true,
        message: "User added to group successfully",
        data: group,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add user to group";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Remove User from Group
  async removeFromGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { chatId, userId } = req.body;

      if (!chatId || !userId) {
        res.status(400).json({
          success: false,
          message: "Chat ID and user ID required",
        } as ApiResponse);
        return;
      }

      const group = await chatService.removeUserFromGroup(
        chatId,
        req.user.id,
        userId
      );

      // Notify about user removal from group
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          io.to(`chat:${chatId}`).emit("group:user-removed", {
            chatId,
            userId,
            removedBy: req.user.id,
            group,
          });
        }
      } catch (socketError) {
        console.error("Failed to emit group:user-removed event:", socketError);
      }

      res.status(200).json({
        success: true,
        message: "User removed from group successfully",
        data: group,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove user from group";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Leave Group
  async leaveGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Chat ID required",
        } as ApiResponse);
        return;
      }

      const result = await chatService.leaveGroup(chatId, req.user.id);

      // Notify others that user left the group
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          io.to(`chat:${chatId}`).emit("group:user-left", {
            chatId,
            userId: req.user.id,
          });
        }
      } catch (socketError) {
        console.error("Failed to emit group:user-left event:", socketError);
      }

      res.status(200).json({
        success: true,
        message: result.message,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to leave group";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Delete chat for current user (remove from sidebar)
  async deleteChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Chat ID required",
        } as ApiResponse);
        return;
      }

      await chatService.deleteChatForUser(chatId, req.user.id);

      res.status(200).json({
        success: true,
        message: "Chat removed for current user",
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete chat";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  // Update group description
  async updateGroupDescription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { description } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const updated = await chatService.updateGroupDescription(
        chatId,
        req.user.id,
        description
      );

      // Broadcast description change
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          io.to(`chat:${chatId}`).emit("group:updated", {
            chatId,
            group: updated,
            updatedBy: req.user.id,
            type: "description",
          });
        }
      } catch (socketError) {
        console.error(
          "Failed to emit group:updated (description) event:",
          socketError
        );
      }

      res.status(200).json({
        success: true,
        message: "Group description updated",
        data: updated,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update group description";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  // Update group avatar
  async updateGroupAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log("🔍 updateGroupAvatar called");
      const { chatId } = req.params;
      console.log("🔍 chatId:", chatId);
      
      if (!req.user) {
        console.error("❌ No authenticated user");
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const file = (req as any).file;
      console.log("🔍 file:", file ? "exists" : "missing");
      
      if (!file) {
        console.error("No file in request");
        console.error("Request body:", req.body);
        console.error("Request headers:", req.headers["content-type"]);
        res.status(400).json({
          success: false,
          message: "No file uploaded",
        } as ApiResponse);
        return;
      }

      console.log("file details:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer,
        bufferLength: file.buffer?.length
      });

      // Validate file properties
      if (!file.originalname) {
        console.error("No originalname in file");
        res.status(400).json({
          success: false,
          message: "Invalid file: missing filename",
        } as ApiResponse);
        return;
      }

      if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        console.error("Invalid file type:", file.mimetype);
        res.status(400).json({
          success: false,
          message: "Only image files are allowed",
        } as ApiResponse);
        return;
      }

      if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
        console.error("Invalid file buffer");
        res.status(400).json({
          success: false,
          message: "Invalid file: missing buffer",
        } as ApiResponse);
        return;
      }

      // Import file upload utilities
      const { saveFile } = await import("../utils/fileUpload.js");

      console.log("Saving file...");
      console.log("File name:", file.originalname);
      console.log("File mimeType:", file.mimetype);
      console.log("File buffer size:", file.buffer?.length || 0);
      
      // Validate file properties before saving
      if (!file.originalname || typeof file.originalname !== "string") {
        throw new Error("Invalid file: originalname is missing or invalid");
      }
      
      if (!file.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        throw new Error("Invalid file: buffer is missing or empty");
      }
      
      // Save file
      const { fileUrl } = await saveFile(file.buffer, file.originalname, {
        mimeType: file.mimetype || "image/jpeg",
      });
      console.log("File saved, URL:", fileUrl);

      console.log("Updating group avatar in database...");
      const updated = await chatService.updateGroupAvatar(
        chatId,
        req.user.id,
        fileUrl
      );
      console.log("Group avatar updated successfully");

      // Broadcast avatar change
      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();

        if (io) {
          io.to(`chat:${chatId}`).emit("group:updated", {
            chatId,
            group: updated,
            updatedBy: req.user.id,
            type: "avatar",
          });
        }
      } catch (socketError) {
        console.error(
          "Failed to emit group:updated (avatar) event:",
          socketError
        );
      }

      res.status(200).json({
        success: true,
        message: "Group avatar updated",
        data: updated,
      } as ApiResponse);
    } catch (error) {
      console.error("Error in updateGroupAvatar:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : String(error));
      const message =
        error instanceof Error ? error.message : "Failed to update group avatar";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }
}

export const chatController = new ChatController();
