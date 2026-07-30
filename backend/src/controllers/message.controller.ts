import type { Request, Response } from "express";
import { prisma } from "../configs/database.js";
import type { AuthRequest, ApiResponse } from "../types/type.js";
import { getFullFileUrl } from "../utils/fileUpload.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { messageService } from "../services/message.service.js";
import { blockService } from "../services/block.service.js";
import { onlineUsers } from "../socket/socket.js";

export class MessageController {
  //* Get messages for a chat
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      // Verify user is a participant in the chat
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: req.user.id,
        },
      });

      if (!participant) {
        res.status(403).json({
          success: false,
          message: "You are not a participant in this chat",
        } as ApiResponse);
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const cursor = req.query.cursor as string | undefined;

      const [chat, hiddenMessageIds] = await Promise.all([
        prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            participants: {
              where: { userId: { not: req.user.id } },
              select: { userId: true },
            },
          },
        }),
        messageService
          .getHiddenMessageIds(req.user.id, chatId)
          .catch(() => [] as string[]),
      ]);

      // For 1-on-1 chats, filter out messages if user is blocked
      let blockedSenderIds: string[] = [];
      if (chat && !chat.isGroup && chat.participants.length > 0) {
        const otherUserId = chat.participants[0].userId;

        const isBlocked =
          (await blockService.isBlocked(req.user.id, otherUserId)) ||
          (await blockService.isBlocked(otherUserId, req.user.id));

        if (isBlocked) {
          blockedSenderIds = [otherUserId];
        }
      }

      const messages = await prisma.message.findMany({
        where: {
          chatId,
          ...(hiddenMessageIds.length > 0 && {
            id: { notIn: hiddenMessageIds },
          }),
          ...(blockedSenderIds.length > 0 && {
            senderId: { notIn: blockedSenderIds },
          }),
          ...(cursor && { createdAt: { lt: new Date(cursor) } }),
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true, avatar: true } },
            },
          },
          reactions: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      });

      const hasMore = messages.length > limit;
      const paginatedMessages = hasMore ? messages.slice(0, limit) : messages;
      paginatedMessages.reverse();

      const baseUrl = req.protocol + "://" + req.get("host");
      const messagesWithFullUrls = paginatedMessages.map((msg) => {
        if (msg.mediaUrl && !msg.mediaUrl.startsWith("http")) {
          return {
            ...msg,
            mediaUrl: getFullFileUrl(msg.mediaUrl, baseUrl),
          };
        }
        return msg;
      });

      if (!cursor) {
        void messageService.markChatAsRead(chatId, req.user.id);
      }

      res.status(200).json({
        success: true,
        message: "Messages fetched",
        data: messagesWithFullUrls,
        hasMore,
        nextCursor: hasMore
          ? paginatedMessages[0]?.createdAt?.toISOString()
          : null,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch messages";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Send a text message
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId, content, replyToId } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      if (!content || !chatId) {
        res.status(400).json({
          success: false,
          message: "Content and chatId required",
        });
        return;
      }

      // Verify user is a participant in the chat
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: req.user.id,
        },
      });

      if (!participant) {
        res.status(403).json({
          success: false,
          message: "You are not a participant in this chat",
        } as ApiResponse);
        return;
      }

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            where: { userId: { not: req.user.id } },
            select: { userId: true },
          },
        },
      });

      if (chat && !chat.isGroup && chat.participants.length > 0) {
        const otherUserId = chat.participants[0].userId;
        const blocked =
          (await blockService.isBlocked(req.user.id, otherUserId)) ||
          (await blockService.isBlocked(otherUserId, req.user.id));
        if (blocked) {
          res.status(403).json({
            success: false,
            message: "Cannot send message. User is blocked.",
          } as ApiResponse);
          return;
        }
      }

      // Verify replyToId if provided
      if (replyToId) {
        const replyToMessage = await prisma.message.findFirst({
          where: {
            id: replyToId,
            chatId,
          },
        });

        if (!replyToMessage) {
          res.status(400).json({
            success: false,
            message: "Reply message not found",
          } as ApiResponse);
          return;
        }
      }

      const message = await prisma.message.create({
        data: {
          content,
          chatId,
          senderId: req.user.id,
          type: "TEXT",
          status: "SENT",
          replyToId: replyToId || null,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      });

      // Update chat updatedAt
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      // Broadcast message via socket
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        const payload = {
          id: message.id,
          content: message.content,
          type: message.type,
          status: message.status,
          senderId: message.senderId,
          chatId: message.chatId,
          createdAt: message.createdAt,
          sender: message.sender,
          replyTo: message.replyTo,
          replyToId: message.replyToId,
        };

        // To users who have joined the chat room
        io.to(`chat:${chatId}`).emit("message:new", payload);

        // Also send directly to each participant's socket for sidebar updates,
        // even if they haven't joined the chat room yet.
        const participants = await prisma.chatParticipant.findMany({
          where: { chatId },
          select: { userId: true },
        });

        for (const p of participants) {
          const socketId = onlineUsers.get(p.userId);
          if (socketId) {
            io.to(socketId).emit("message:new", payload);
          }
        }
      }

      res.status(201).json({
        success: true,
        message: "Message sent",
        data: message,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Send a media/file message
  async sendMedia(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const { chatId } = req.body;
      const file = req.file;

      if (!chatId || !file) {
        res.status(400).json({
          success: false,
          message: "ChatId and file required",
        });
        return;
      }

      // Verify user is a participant in the chat
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: req.user.id,
        },
      });

      if (!participant) {
        res.status(403).json({
          success: false,
          message: "You are not a participant in this chat",
        } as ApiResponse);
        return;
      }

      // Check if chat is 1-on-1 (not group) and if user is blocked
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            where: { userId: { not: req.user.id } },
            select: { userId: true },
          },
        },
      });

      // For 1-on-1 chats, check if user is blocked
      if (chat && !chat.isGroup && chat.participants.length > 0) {
        const otherUserId = chat.participants[0].userId;

        // Check if sender blocked the other user OR other user blocked the sender
        const isBlocked =
          (await blockService.isBlocked(req.user.id, otherUserId)) ||
          (await blockService.isBlocked(otherUserId, req.user.id));

        if (isBlocked) {
          res.status(403).json({
            success: false,
            message: "Cannot send message. User is blocked.",
          } as ApiResponse);
          return;
        }
      }

      // Determine message type from MIME type
      let messageType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" = "DOCUMENT";
      if (file.mimetype.startsWith("image/")) messageType = "IMAGE";
      else if (file.mimetype.startsWith("video/")) messageType = "VIDEO";
      else if (file.mimetype.startsWith("audio/")) messageType = "AUDIO";

      // Upload file to Cloudinary
      const cloudinaryResourceType =
        messageType === "IMAGE"
          ? "image"
          : messageType === "VIDEO"
            ? "video"
            : "raw";

      const uploadResult = await uploadToCloudinary(file.buffer, {
        resource_type: cloudinaryResourceType,
        folder: "chit-chat-uploads",
      });

      const fileName = file.originalname;
      const fileSize = uploadResult.bytes;
      const mimeType = file.mimetype;

      // Use secure Cloudinary URL as mediaUrl
      const fullFileUrl = uploadResult.secure_url || uploadResult.url;

      // Create message in database (store relative URL, we'll convert when sending)
      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: req.user.id,
          type: messageType,
          mediaUrl: fullFileUrl,
          fileName,
          fileSize,
          mimeType,
          content: file.originalname,
          status: "SENT",
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
      });

      // Message already has full Cloudinary URL
      const messageWithFullUrl = message;

      // Update chat updatedAt
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      // Broadcast message via socket with full URL
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        const payload = {
          id: message.id,
          content: message.content,
          type: message.type,
          status: message.status,
          senderId: message.senderId,
          chatId: message.chatId,
          createdAt: message.createdAt,
          sender: message.sender,
          mediaUrl: fullFileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          mimeType: message.mimeType,
        };

        // To users currently in the chat room
        io.to(`chat:${chatId}`).emit("message:new", payload);

        // And directly to each participant's socket (for sidebar updates)
        const participants = await prisma.chatParticipant.findMany({
          where: { chatId },
          select: { userId: true },
        });

        for (const p of participants) {
          const socketId = onlineUsers.get(p.userId);
          if (socketId) {
            io.to(socketId).emit("message:new", payload);
          }
        }
      }

      res.status(201).json({
        success: true,
        message: "Media sent",
        data: messageWithFullUrl,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send media";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Delete a message
  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const { messageId } = req.params;
      const scopeParam = (req.query.scope as string) || "everyone";

      if (scopeParam !== "me" && scopeParam !== "everyone") {
        res.status(400).json({
          success: false,
          message: "Invalid scope. Use 'me' or 'everyone'.",
        } as ApiResponse);
        return;
      }

      const scope = scopeParam as "me" | "everyone";

      if (!messageId) {
        res.status(400).json({
          success: false,
          message: "Message ID required",
        });
        return;
      }

      // Get message to check chatId
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        res.status(404).json({
          success: false,
          message: "Message not found",
        } as ApiResponse);
        return;
      }

      const result = await messageService.deleteMessage(
        messageId,
        req.user.id,
        scope,
      );

      if (result.scope === "everyone") {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();
        if (io) {
          io.to(`chat:${result.chatId}`).emit("message:deleted", {
            messageId,
            chatId: result.chatId,
            deletedBy: req.user.id,
            scope: "everyone",
          });
        }
      }

      res.status(200).json({
        success: true,
        message:
          scope === "me"
            ? "Message deleted for you"
            : "Message deleted for everyone",
        data: result.scope === "everyone" ? result.message : { messageId, scope: "me" },
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete message";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Mark all messages in a chat as read
  async markChatAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Chat ID required",
        });
        return;
      }

      // Verify user is a participant
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: req.user.id,
        },
      });

      if (!participant) {
        res.status(403).json({
          success: false,
          message: "You are not a participant in this chat",
        } as ApiResponse);
        return;
      }

      const result = await messageService.markChatAsRead(chatId, req.user.id);

      res.status(200).json({
        success: true,
        message: "Messages marked as read",
        data: result,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to mark as read";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Get unread message count for a chat
  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Chat ID required",
        });
        return;
      }

      // Verify user is a participant
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: req.user.id,
        },
      });

      if (!participant) {
        res.status(403).json({
          success: false,
          message: "You are not a participant in this chat",
        } as ApiResponse);
        return;
      }

      const count = await messageService.getUnreadCount(chatId, req.user.id);

      res.status(200).json({
        success: true,
        data: { chatId, count },
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get unread count";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Get unread counts for all chats
  async getAllUnreadCounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const counts = await messageService.getAllUnreadCounts(req.user.id);

      res.status(200).json({
        success: true,
        data: counts,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get unread counts";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Edit a message
  async editMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { content } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      if (!content) {
        res.status(400).json({
          success: false,
          message: "Content required",
        } as ApiResponse);
        return;
      }

      const updated = await messageService.editMessage(
        messageId,
        req.user.id,
        content,
      );

      // Broadcast update via socket
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(`chat:${updated.chatId}`).emit("message:edited", {
          id: updated.id,
          content: updated.content,
          isEdited: updated.isEdited,
          editedAt: updated.editedAt,
        });
      }

      res.status(200).json({
        success: true,
        message: "Message edited",
        data: updated,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to edit message";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Add reaction to message
  async addReaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      if (!emoji) {
        res.status(400).json({
          success: false,
          message: "Emoji required",
        } as ApiResponse);
        return;
      }

      const reaction = await messageService.addReaction(
        messageId,
        req.user.id,
        emoji,
      );

      // Get message to broadcast
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          reactions: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      });

      // Broadcast reaction via socket
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io && message) {
        io.to(`chat:${message.chatId}`).emit("message:reaction", {
          messageId: message.id,
          reactions: message.reactions,
        });
      }

      res.status(200).json({
        success: true,
        message: "Reaction added",
        data: reaction,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add reaction";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Remove reaction from message
  async removeReaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      await messageService.removeReaction(messageId, req.user.id);

      // Get message to broadcast
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          reactions: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      });

      // Broadcast reaction removal via socket
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io && message) {
        io.to(`chat:${message.chatId}`).emit("message:reaction", {
          messageId: message.id,
          reactions: message.reactions,
        });
      }

      res.status(200).json({
        success: true,
        message: "Reaction removed",
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove reaction";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Pin a message
  async pinMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { chatId } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Chat ID required",
        } as ApiResponse);
        return;
      }

      const pinned = await messageService.pinMessage(
        messageId,
        chatId,
        req.user.id,
      );

      // Broadcast pin via socket
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(`chat:${chatId}`).emit("message:pinned", {
          messageId: pinned.id,
          pinnedAt: pinned.pinnedAt,
        });
      }

      res.status(200).json({
        success: true,
        message: "Message pinned",
        data: pinned,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to pin message";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Unpin a message
  async unpinMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { chatId } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Chat ID required",
        } as ApiResponse);
        return;
      }

      await messageService.unpinMessage(messageId, chatId, req.user.id);

      // Broadcast unpin via socket
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(`chat:${chatId}`).emit("message:unpinned", {
          messageId,
        });
      }

      res.status(200).json({
        success: true,
        message: "Message unpinned",
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to unpin message";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }

  //* Get pinned message
  async getPinnedMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const pinned = await messageService.getPinnedMessage(chatId, req.user.id);

      res.status(200).json({
        success: true,
        data: pinned,
      } as ApiResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get pinned message";
      res.status(400).json({ success: false, message } as ApiResponse);
    }
  }
}

export const messageController = new MessageController();
