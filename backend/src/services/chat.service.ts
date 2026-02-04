import { prisma } from "../configs/database.js";

export class ChatService {
  // 1-on-1 Chat access karna (Find or Create)
  async accessChat(currentUserId: string, targetUserId: string) {
    if (!targetUserId) {
      throw new Error("UserId param not sent with request");
    }

    if (currentUserId === targetUserId) {
      throw new Error("Cannot create chat with yourself");
    }

    // Step 1: Check if 1-on-1 chat already exists using ChatParticipant
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: { userId: currentUserId },
            },
          },
          {
            participants: {
              some: { userId: targetUserId },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Step 2: If chat exists, format and return
    if (existingChat) {
      return this.formatChatResponse(existingChat);
    }

    // Step 3: Create new chat with participants
    const newChat = await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: currentUserId }, { userId: targetUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return this.formatChatResponse(newChat);
  }

  // User ki saari chats fetch karna
  async fetchChats(userId: string) {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Format response to match frontend expectations
    return chats.map((chat) => this.formatChatResponse(chat));
  }

  // Helper: Format chat response for frontend compatibility
  private formatChatResponse(chat: any) {
    const latestMessage = chat.messages[0] || null;

    return {
      id: chat.id,
      chatName: chat.name,
      isGroupChat: chat.isGroup,
      avatar: chat.avatar,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      // Convert participants to users array (frontend expects this)
      users: chat.participants.map((p: any) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        phone: p.user.phone,
        avatar: p.user.avatar,
        isOnline: p.user.isOnline,
        lastSeen: p.user.lastSeen,
      })),
      // Format latest message
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            content: latestMessage.content,
            createdAt: latestMessage.createdAt,
            sender: {
              id: latestMessage.sender.id,
              name: latestMessage.sender.name,
              email: latestMessage.sender.email,
            },
          }
        : null,
    };
  }
}

export const chatService = new ChatService();