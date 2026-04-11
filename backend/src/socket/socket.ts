import { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "../types/type.js";
import { prisma } from "../configs/database.js";
import { blockService } from "../services/block.service.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { devLog, devError } from "../utils/devLog.js";

// Type alias for our Socket
type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

// Online users store (Production me Redis use karo)
const onlineUsers = new Map<string, string>(); // userId -> socketId

// Parse Cookie header (e.g. "accessToken=xyz; refreshToken=abc")
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, s) => {
    const eq = s.indexOf("=");
    if (eq === -1) return acc;
    const k = s.slice(0, eq).trim();
    const v = s.slice(eq + 1).trim();
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);
}

export function setupSocket(io: TypedServer): void {
  // Auth middleware: verify access token from cookie (httpOnly cookies sent with withCredentials)
  io.use((socket: TypedSocket, next) => {
    const cookieHeader =
      socket.handshake.headers?.cookie ??
      (socket.handshake as any).request?.headers?.cookie;
    const cookies = parseCookies(cookieHeader);
    const token = cookies.accessToken;
    if (!token) {
      return next(new Error("Access token required"));
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error("Invalid or expired token"));
    }
    socket.data.userId = payload.userId;
    next();
  });

  io.on("connection", (socket: TypedSocket) => {
    devLog(`🔌 New socket connection: ${socket.id}`);

    // ============================================
    // USER CONNECT EVENT (userId must match token; sets online status)
    // ============================================
    socket.on("user:connect", async (userId: string) => {
      try {
        if (!userId || typeof userId !== "string") {
          devError("❌ Invalid userId received:", userId);
          socket.emit("error", { message: "Invalid user ID" });
          return;
        }
        if (socket.data.userId && socket.data.userId !== userId) {
          socket.emit("error", { message: "Invalid user ID" });
          return;
        }
        if (!socket.data.userId) socket.data.userId = userId;

        onlineUsers.set(userId, socket.id);

        await prisma.user.update({
          where: { id: userId },
          data: {
            isOnline: true,
            lastSeen: new Date(),
          },
        });

        // Send current online users list to the newly connected user
        const currentOnlineUserIds = Array.from(onlineUsers.keys());
        socket.emit("user:online-list", currentOnlineUserIds);

        socket.broadcast.emit("user:online", userId);

        // Deliver any pending messages for this user
        const pendingMessages = await prisma.message.findMany({
          where: {
            status: "SENT",
            senderId: { not: userId },
            chat: {
              participants: {
                some: { userId },
              },
            },
          },
          select: { id: true, senderId: true },
        });

        if (pendingMessages.length > 0) {
          const messageIds = pendingMessages.map((m) => m.id);
          await prisma.message.updateMany({
            where: { id: { in: messageIds } },
            data: { status: "DELIVERED", deliveredAt: new Date() },
          });

          for (const msg of pendingMessages) {
            const senderSocketId = onlineUsers.get(msg.senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit("message:delivered", {
                messageId: msg.id,
                deliveredAt: new Date(),
              });
            }
          }
        }

        devLog(
          `✅ User ${userId} connected. Online users: ${onlineUsers.size}`
        );
      } catch (error) {
        devError("Error in user:connect:", error);
        socket.emit("error", { message: "Failed to connect" });
      }
    });

    // ============================================
    // JOIN CHAT ROOM (verified participant only)
    // ============================================
    socket.on("chat:join", async (chatId: string) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;

        const participant = await prisma.chatParticipant.findFirst({
          where: { chatId, userId },
        });

        if (!participant) {
          socket.emit("error", { message: "Not a participant in this chat" });
          return;
        }

        socket.join(`chat:${chatId}`);
        devLog(`👥 Socket ${socket.id} joined chat:${chatId}`);
      } catch (error) {
        devError("Error in chat:join:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // ============================================
    // LEAVE CHAT ROOM
    // ============================================
    socket.on("chat:leave", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      devLog(`👋 Socket ${socket.id} left chat:${chatId}`);
    });

    // ============================================
    // SEND MESSAGE (via Socket - for real-time only)
    // ============================================
    socket.on("message:send", async (data, callback) => {
      try {
        const { content, chatId, type = "TEXT", replyToId } = data;
        const senderId = socket.data.userId;

        if (!senderId) {
          if (typeof callback === "function") {
            callback({ success: false, error: "Not authenticated" });
          }
          return;
        }

        // Verify user is a participant
        const participant = await prisma.chatParticipant.findFirst({
          where: {
            chatId,
            userId: senderId,
          },
        });

        if (!participant) {
          if (typeof callback === "function") {
            callback({
              success: false,
              error: "You are not a participant in this chat",
            });
          }
          return;
        }

        // Check if chat is 1-on-1 (not group)
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            participants: {
              where: { userId: { not: senderId } },
              select: { userId: true },
            },
          },
        });

        // For 1-on-1 chats, check if user is blocked
        if (chat && !chat.isGroup && chat.participants.length > 0) {
          const otherUserId = chat.participants[0].userId;
          
          // Check if sender blocked the other user OR other user blocked the sender
          const isBlocked = await blockService.isBlocked(senderId, otherUserId) || 
                           await blockService.isBlocked(otherUserId, senderId);
          
          if (isBlocked) {
            if (typeof callback === "function") {
              callback({
                success: false,
                error: "Cannot send message. User is blocked.",
              });
            }
            return;
          }
        }

        if (replyToId) {
          const replyMsg = await prisma.message.findFirst({
            where: { id: replyToId, chatId },
          });
          if (!replyMsg) {
            if (typeof callback === "function") {
              callback({ success: false, error: "Reply message not found in this chat" });
            }
            return;
          }
        }

        const message = await prisma.message.create({
          data: {
            content,
            type,
            senderId,
            chatId,
            replyToId: replyToId || null,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        });

        // Update chat's updatedAt for sorting
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });

        // Send to all in chat room (including sender)
        io.to(`chat:${chatId}`).emit("message:new", {
          id: message.id,
          content: message.content,
          type: message.type,
          status: message.status,
          senderId: message.senderId,
          chatId: message.chatId,
          createdAt: message.createdAt,
          sender: message.sender,
        });

        // Callback to sender with success
        if (typeof callback === "function") {
          callback({
            success: true,
            message: {
              id: message.id,
              content: message.content,
              type: message.type,
              status: message.status,
              senderId: message.senderId,
              chatId: message.chatId,
              createdAt: message.createdAt,
              sender: message.sender,
            },
          });
        }

        devLog(`📨 Message sent in chat:${chatId}`);
      } catch (error) {
        devError("Error sending message:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: "Failed to send message" });
        }
      }
    });

    // ============================================
    // TYPING INDICATORS
    // ============================================
    socket.on("typing:start", async (chatId: string) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;
        const participant = await prisma.chatParticipant.findFirst({
          where: { chatId, userId },
        });
        if (!participant) return;
        socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId });
      } catch (error) {
        devError("Error in typing:start:", error);
      }
    });

    socket.on("typing:stop", async (chatId: string) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;
        const participant = await prisma.chatParticipant.findFirst({
          where: { chatId, userId },
        });
        if (!participant) return;
        socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId });
      } catch (error) {
        devError("Error in typing:stop:", error);
      }
    });

    // ============================================
    // MESSAGE DELIVERED (only the recipient can mark)
    // ============================================
    socket.on("message:delivered", async (messageId: string) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;

        const existing = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!existing || existing.senderId === userId) return;
        if (existing.status !== "SENT") return;

        const participant = await prisma.chatParticipant.findFirst({
          where: { chatId: existing.chatId, userId },
        });
        if (!participant) return;

        const message = await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });

        const senderSocketId = onlineUsers.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message:delivered", {
            messageId,
            deliveredAt: message.deliveredAt!,
          });
        }
      } catch (error) {
        devError("Error updating delivery status:", error);
      }
    });

    // ============================================
    // MESSAGE READ (only the recipient can mark)
    // ============================================
    socket.on("message:read", async ({ messageId, chatId }) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;

        const existing = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!existing || existing.senderId === userId) return;
        if (existing.chatId !== chatId) return;

        const participant = await prisma.chatParticipant.findFirst({
          where: { chatId: existing.chatId, userId },
        });
        if (!participant) return;

        if (existing.status === "READ") return;

        const message = await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "READ",
            readAt: new Date(),
          },
        });

        const senderSocketId = onlineUsers.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message:read", {
            messageId,
            readAt: message.readAt!,
          });
        }
      } catch (error) {
        devError("Error updating read status:", error);
      }
    });

    // ============================================
    // DISCONNECT
    // ============================================
    socket.on("disconnect", async () => {
      const userId = socket.data.userId;

      if (userId) {
        onlineUsers.delete(userId);

        // Update database
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              isOnline: false,
              lastSeen: new Date(),
            },
          });
        } catch (error) {
          devError("Error updating user offline status:", error);
        }

        // Broadcast to all
        socket.broadcast.emit("user:offline", {
          userId,
          lastSeen: new Date(),
        });

        devLog(
          `❌ User ${userId} disconnected. Online users: ${onlineUsers.size}`
        );
      }
    });

    // ============================================
    // MESSAGE DELETE
    // ============================================
    socket.on("message:delete", async (data) => {
      try {
        const { messageId, chatId } = data;
        const userId = socket.data.userId;

        if (!userId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        // Verify message exists and user is the sender
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        if (message.senderId !== userId) {
          socket.emit("error", {
            message: "You can only delete your own messages",
          });
          return;
        }

        if (message.chatId !== chatId) {
          socket.emit("error", { message: "Message not found in this chat" });
          return;
        }

        await prisma.message.update({
          where: { id: messageId },
          data: {
            content: "This message was deleted",
            status: "SENT",
            mediaUrl: null,
            fileName: null,
            fileSize: null,
            mimeType: null,
          },
        });

        // Broadcast to all in chat room
        io.to(`chat:${chatId}`).emit("message:deleted", {
          messageId,
          chatId,
          deletedBy: userId,
        });

        devLog(`🗑️ Message ${messageId} deleted in chat:${chatId}`);
      } catch (error) {
        devError("Error deleting message:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // ============================================
    // GROUP OPERATIONS (participant-verified)
    // ============================================
    socket.on("group:created", async (data) => {
      try {
        const emitterId = socket.data.userId;
        if (!emitterId) return;

        const { chatId, participants } = data;

        const isParticipant = await prisma.chatParticipant.findFirst({
          where: { chatId, userId: emitterId },
        });
        if (!isParticipant) return;

        participants.forEach((userId: string) => {
          const socketId = onlineUsers.get(userId);
          if (socketId) {
            io.to(socketId).emit("group:created", data);
          }
        });
      } catch (error) {
        devError("Error in group:created:", error);
        socket.emit("error", { message: "Failed to process group creation" });
      }
    });

    socket.on("group:updated", async (data) => {
      try {
        const emitterId = socket.data.userId;
        if (!emitterId) return;

        const { chatId } = data;

        const isAdmin = await prisma.chatParticipant.findFirst({
          where: { chatId, userId: emitterId, role: "ADMIN" },
        });
        if (!isAdmin) {
          socket.emit("error", { message: "Only admins can update group info" });
          return;
        }

        io.to(`chat:${chatId}`).emit("group:updated", data);
      } catch (error) {
        devError("Error in group:updated:", error);
        socket.emit("error", { message: "Failed to update group" });
      }
    });

    socket.on("group:user-added", async (data) => {
      try {
        const emitterId = socket.data.userId;
        if (!emitterId) return;

        const { chatId, userId } = data;

        const isAdmin = await prisma.chatParticipant.findFirst({
          where: { chatId, userId: emitterId, role: "ADMIN" },
        });
        if (!isAdmin) {
          socket.emit("error", { message: "Only admins can add users" });
          return;
        }

        const socketId = onlineUsers.get(userId);
        if (socketId) {
          io.to(socketId).emit("group:user-added", data);
        }
        io.to(`chat:${chatId}`).emit("group:user-added", data);
      } catch (error) {
        devError("Error in group:user-added:", error);
        socket.emit("error", { message: "Failed to add user to group" });
      }
    });

    socket.on("group:user-removed", async (data) => {
      try {
        const emitterId = socket.data.userId;
        if (!emitterId) return;

        const { chatId, userId } = data;

        const isAdmin = await prisma.chatParticipant.findFirst({
          where: { chatId, userId: emitterId, role: "ADMIN" },
        });
        if (!isAdmin) {
          socket.emit("error", { message: "Only admins can remove users" });
          return;
        }

        const socketId = onlineUsers.get(userId);
        if (socketId) {
          io.to(socketId).emit("group:user-removed", data);
        }
        io.to(`chat:${chatId}`).emit("group:user-removed", data);
      } catch (error) {
        devError("Error in group:user-removed:", error);
        socket.emit("error", { message: "Failed to remove user from group" });
      }
    });
  });
}

export { onlineUsers };
