import type { Response } from "express";
import { statusService } from "../services/status.service.js";
import { getFullFileUrl } from "../utils/fileUpload.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";
import { devError } from "../utils/devLog.js";
import { prisma } from "../configs/database.js";
import { onlineUsers } from "../socket/socket.js";

export class StatusController {
  //  * Create a status
  async createStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const { content, type = "TEXT" } = req.body;
      let mediaUrl: string | undefined;

      // Handle file upload (Cloudinary)
      if (req.file && req.file.buffer) {
        try {
          const uploadResult = await uploadToCloudinary(req.file.buffer, {
            resource_type: type === "VIDEO" ? "video" : "image",
            folder: "chit-chat-status",
          });

          mediaUrl = uploadResult.secure_url || uploadResult.url;
        } catch (error) {
          devError("Error uploading status file to Cloudinary:", error);
          res.status(400).json({
            success: false,
            message: "Failed to upload file",
          } as ApiResponse);
          return;
        }
      }

      const status = await statusService.createStatus(
        req.user.id,
        content,
        mediaUrl,
        type,
      );

      // status notification to users
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        const contactIds = await statusService.getContactIds(req.user.id);
        for (const contactId of contactIds) {
          const socketId = onlineUsers.get(contactId);
          if (socketId) {
            io.to(socketId).emit("status:new", status);
          }
        }
      }

      res.status(201).json({
        success: true,
        message: "Status created",
        data: status,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create status";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Get all statuses from contacts
  async getStatuses(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const statuses = await statusService.getStatuses(req.user.id);

      // Converting relative media URLs and user avatars to full URLs
      const baseUrl = req.protocol + "://" + req.get("host");
      const statusesWithFullUrls = statuses.map((userStatus) => ({
        ...userStatus,
        user: {
          ...userStatus.user,
          avatar: userStatus.user?.avatar
            ? getFullFileUrl(userStatus.user.avatar, baseUrl)
            : userStatus.user?.avatar,
        },
        statuses: userStatus.statuses.map((status) => {
          if (
            status.mediaUrl &&
            typeof status.mediaUrl === "string" &&
            !status.mediaUrl.startsWith("http")
          ) {
            return {
              ...status,
              mediaUrl: getFullFileUrl(status.mediaUrl, baseUrl),
            };
          }
          return status;
        }),
      }));

      res.status(200).json({
        success: true,
        data: statusesWithFullUrls,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get statuses";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Get user's own statuses
  async getMyStatuses(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const statuses = await statusService.getMyStatuses(req.user.id);

      // Converting relative media URLs to full URLs
      const baseUrl = req.protocol + "://" + req.get("host");
      const statusesWithFullUrls = statuses.map((status) => {
        if (
          status.mediaUrl &&
          typeof status.mediaUrl === "string" &&
          !status.mediaUrl.startsWith("http")
        ) {
          return {
            ...status,
            mediaUrl: getFullFileUrl(status.mediaUrl, baseUrl),
          };
        }
        return status;
      });

      res.status(200).json({
        success: true,
        data: statusesWithFullUrls,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get statuses";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* View a status
  async viewStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { statusId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const view = await statusService.viewStatus(statusId, req.user.id);

      // Emit view only to the status owner
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io && view.status) {
        const ownerSocketId = onlineUsers.get(view.status.userId);
        if (ownerSocketId) {
          io.to(ownerSocketId).emit("status:viewed", {
            statusId,
            view,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Status viewed",
        data: view,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to view status";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Add reaction to status
  async addReaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { statusId } = req.params;
      const { emoji } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      if (!emoji) {
        res.status(400).json({
          success: false,
          message: "Emoji required",
        } as ApiResponse);
        return;
      }

      const reaction = await statusService.addReaction(
        statusId,
        req.user.id,
        emoji,
      );

      // Emit reaction only to the status owner
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io && reaction.status) {
        const ownerSocketId = onlineUsers.get(reaction.status.userId);
        if (ownerSocketId) {
          io.to(ownerSocketId).emit("status:reaction", {
            statusId,
            reaction,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Reaction added",
        data: reaction,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add reaction";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Remove reaction from status
  async removeReaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { statusId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const removedStatus = await statusService.removeReaction(
        statusId,
        req.user.id,
      );

      // Emit reaction
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io && removedStatus) {
        const ownerSocketId = onlineUsers.get(removedStatus.userId);
        if (ownerSocketId) {
          io.to(ownerSocketId).emit("status:reaction:removed", {
            statusId,
            userId: req.user.id,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Reaction removed",
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove reaction";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }

  //* Delete a status
  async deleteStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { statusId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
        } as ApiResponse);
        return;
      }

      const result = await statusService.deleteStatus(statusId, req.user.id);

      // Emit deletion only to contacts
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        const contactIds = await statusService.getContactIds(req.user.id);
        for (const contactId of contactIds) {
          const socketId = onlineUsers.get(contactId);
          if (socketId) {
            io.to(socketId).emit("status:deleted", { statusId });
          }
        }
      }

      res.status(200).json({
        success: true,
        message: result.message,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete status";
      res.status(400).json({
        success: false,
        message,
      } as ApiResponse);
    }
  }
}

export const statusController = new StatusController();
