import { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "../types/type.js";
import { prisma } from "../configs/database.js";
import { blockService } from "../services/block.service.js";

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

export function setupSocket(io: TypedServer): void {
  io.on("connection", (socket: TypedSocket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);

    // ============================================
    // USER CONNECT EVENT
    // ============================================
    socket.on("user:connect", async (userId: string) => {
      try {
        if (!userId || typeof userId !== "string") {
          console.error("❌ Invalid userId received:", userId);
          socket.emit("error", { message: "Invalid user ID" });
          return;
        }

        // Store user mapping
        onlineUsers.set(userId, socket.id);
        socket.data.userId = userId;

        // Update user status in database
        await prisma.user.update({
          where: { id: userId },
          data: {
            isOnline: true,
            lastSeen: new Date(),
          },
        });

        // Broadcast to all that user is online
        socket.broadcast.emit("user:online", userId);

        console.log(
          `✅ User ${userId} connected. Online users: ${onlineUsers.size}`
        );
      } catch (error) {
        console.error("Error in user:connect:", error);
        socket.emit("error", { message: "Failed to connect" });
      }
    });

    // ============================================
    // JOIN CHAT ROOM
    // ============================================
    socket.on("chat:join", (chatId: string) => {
      socket.join(`chat:${chatId}`);
      console.log(`👥 Socket ${socket.id} joined chat:${chatId}`);
    });

    // ============================================
    // LEAVE CHAT ROOM
    // ============================================
    socket.on("chat:leave", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`👋 Socket ${socket.id} left chat:${chatId}`);
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

        // Save message to database
        const message = await prisma.message.create({
          data: {
            content,
            type,
            senderId,
            chatId,
            replyToId,
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

        console.log(`📨 Message sent in chat:${chatId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: "Failed to send message" });
        }
      }
    });

    // ============================================
    // TYPING INDICATORS
    // ============================================
    socket.on("typing:start", (chatId: string) => {
      const userId = socket.data.userId;
      if (userId) {
        socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId });
      }
    });

    socket.on("typing:stop", (chatId: string) => {
      const userId = socket.data.userId;
      if (userId) {
        socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId });
      }
    });

    // ============================================
    // MESSAGE DELIVERED
    // ============================================
    socket.on("message:delivered", async (messageId: string) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });

        // Notify sender
        const senderSocketId = onlineUsers.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message:delivered", {
            messageId,
            deliveredAt: message.deliveredAt!,
          });
        }
      } catch (error) {
        console.error("Error updating delivery status:", error);
      }
    });

    // ============================================
    // MESSAGE READ
    // ============================================
    socket.on("message:read", async ({ messageId, chatId }) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "READ",
            readAt: new Date(),
          },
        });

        // Notify sender about read receipt
        const senderSocketId = onlineUsers.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message:read", {
            messageId,
            readAt: message.readAt!,
          });
        }
      } catch (error) {
        console.error("Error updating read status:", error);
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
          console.error("Error updating user offline status:", error);
        }

        // Broadcast to all
        socket.broadcast.emit("user:offline", {
          userId,
          lastSeen: new Date(),
        });

        console.log(
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

        // Delete message (soft delete)
        await prisma.message.update({
          where: { id: messageId },
          data: {
            content: "This message was deleted",
            status: "SENT",
          },
        });

        // Broadcast to all in chat room
        io.to(`chat:${chatId}`).emit("message:deleted", {
          messageId,
          chatId,
          deletedBy: userId,
        });

        console.log(`🗑️ Message ${messageId} deleted in chat:${chatId}`);
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // ============================================
    // GROUP OPERATIONS
    // ============================================
    socket.on("group:created", (data) => {
      const { chatId, participants } = data;
      // Notify all participants
      participants.forEach((userId: string) => {
        const socketId = onlineUsers.get(userId);
        if (socketId) {
          io.to(socketId).emit("group:created", data);
        }
      });
    });

    socket.on("group:updated", (data) => {
      const { chatId } = data;
      // Broadcast to all in chat room
      io.to(`chat:${chatId}`).emit("group:updated", data);
    });

    socket.on("group:user-added", (data) => {
      const { chatId, userId } = data;
      // Notify the added user
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit("group:user-added", data);
      }
      // Broadcast to all in chat room
      io.to(`chat:${chatId}`).emit("group:user-added", data);
    });

    socket.on("group:user-removed", (data) => {
      const { chatId, userId } = data;
      // Notify the removed user
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit("group:user-removed", data);
      }
      // Broadcast to all in chat room
      io.to(`chat:${chatId}`).emit("group:user-removed", data);
    });
  });
}

export { onlineUsers };
