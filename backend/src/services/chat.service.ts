import { prisma } from "../configs/database.js";
import { getFullFileUrl } from "../utils/fileUpload.js";
import { blockService } from "./block.service.js";

export class ChatService {
  // 1-on-1 Chat access karna (Find or Create)
  async accessChat(currentUserId: string, targetUserId: string) {
    if (!targetUserId) {
      throw new Error("UserId param not sent with request");
    }

    if (currentUserId === targetUserId) {
      throw new Error("Cannot create chat with yourself");
    }

    // Check if user is blocked
    const isBlocked = await blockService.isBlocked(currentUserId, targetUserId) || 
                     await blockService.isBlocked(targetUserId, currentUserId);
    
    if (isBlocked) {
      throw new Error("Cannot access chat. User is blocked.");
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

    // Filter out 1-on-1 chats with blocked users
    const filteredChats = [];
    for (const chat of chats) {
      // For group chats, always include
      if (chat.isGroup) {
        filteredChats.push(chat);
        continue;
      }

      // For 1-on-1 chats, check if other user is blocked
      const otherParticipant = chat.participants.find((p) => p.userId !== userId);
      if (otherParticipant) {
        const otherUserId = otherParticipant.userId;
        const isBlocked = await blockService.isBlocked(userId, otherUserId) || 
                         await blockService.isBlocked(otherUserId, userId);
        
        // Only include if not blocked
        if (!isBlocked) {
          filteredChats.push(chat);
        }
      }
    }

    // Format response to match frontend expectations
    return filteredChats.map((chat) => this.formatChatResponse(chat));
  }

  // Helper: Format chat response for frontend compatibility
  private formatChatResponse(chat: any) {
    // Safely access messages array - handle undefined or empty array
    const latestMessage = chat.messages && chat.messages.length > 0 ? chat.messages[0] : null;

    return {
      id: chat.id,
      chatName: chat.name,
      isGroupChat: chat.isGroup,
      // Convert relative avatar path to full URL
      avatar: chat.avatar ? getFullFileUrl(chat.avatar) : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      // Convert participants to users array (frontend expects this)
      users: chat.participants.map((p: any) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        phone: p.user.phone,
        // Convert relative avatar path to full URL
        avatar: p.user.avatar ? getFullFileUrl(p.user.avatar) : null,
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

  // Create a group chat
  async createGroupChat(
    creatorId: string,
    name: string,
    userIds: string[]
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error("Group name is required");
    }

    if (!userIds || userIds.length === 0) {
      throw new Error("At least one other user is required");
    }

    // Remove duplicates and ensure creator is not in the list
    const uniqueUserIds = [...new Set(userIds)].filter(
      (id) => id !== creatorId
    );

    if (uniqueUserIds.length === 0) {
      throw new Error("At least one other user is required");
    }

    // Create group with creator as admin and other users as members
    const group = await prisma.chat.create({
      data: {
        name,
        isGroup: true,
        participants: {
          create: [
            { userId: creatorId, role: "ADMIN" },
            ...uniqueUserIds.map((userId) => ({
              userId,
              role: "MEMBER" as const,
            })),
          ],
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

    return this.formatChatResponse(group);
  }

  // Rename group chat
  async renameGroupChat(chatId: string, userId: string, newName: string) {
    if (!newName || newName.trim().length === 0) {
      throw new Error("Group name is required");
    }

    // Check if chat exists and is a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.isGroup) {
      throw new Error("This is not a group chat");
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new Error("You are not a member of this group");
    }

    // Update group name
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: { name: newName },
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

    return this.formatChatResponse(updatedChat);
  }

  // Add user to group
  async addUserToGroup(
    chatId: string,
    adminId: string,
    userIdToAdd: string
  ) {
    // Check if chat exists and is a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.isGroup) {
      throw new Error("This is not a group chat");
    }

    // Check if requester is an admin
    const adminParticipant = chat.participants.find(
      (p) => p.userId === adminId
    );
    if (!adminParticipant || adminParticipant.role !== "ADMIN") {
      throw new Error("Only admins can add users to the group");
    }

    // Check if user is already in the group
    const alreadyMember = chat.participants.some(
      (p) => p.userId === userIdToAdd
    );
    if (alreadyMember) {
      throw new Error("User is already a member of this group");
    }

    // Add user to group
    await prisma.chatParticipant.create({
      data: {
        chatId,
        userId: userIdToAdd,
        role: "MEMBER",
      },
    });

    // Fetch updated chat
    const updatedChat = await prisma.chat.findUnique({
      where: { id: chatId },
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

    return this.formatChatResponse(updatedChat!);
  }

  // Remove user from group
  async removeUserFromGroup(
    chatId: string,
    adminId: string,
    userIdToRemove: string
  ) {
    // Check if chat exists and is a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.isGroup) {
      throw new Error("This is not a group chat");
    }

    // Check if requester is an admin
    const adminParticipant = chat.participants.find(
      (p) => p.userId === adminId
    );
    if (!adminParticipant || adminParticipant.role !== "ADMIN") {
      throw new Error("Only admins can remove users from the group");
    }

    // Check if user to remove is in the group
    const memberToRemove = chat.participants.find(
      (p) => p.userId === userIdToRemove
    );
    if (!memberToRemove) {
      throw new Error("User is not a member of this group");
    }

    // Don't allow removing the last admin
    const adminCount = chat.participants.filter(
      (p) => p.role === "ADMIN"
    ).length;
    if (memberToRemove.role === "ADMIN" && adminCount === 1) {
      throw new Error("Cannot remove the last admin from the group");
    }

    // Remove user from group
    await prisma.chatParticipant.delete({
      where: {
        id: memberToRemove.id,
      },
    });

    // Fetch updated chat
    const updatedChat = await prisma.chat.findUnique({
      where: { id: chatId },
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

    return this.formatChatResponse(updatedChat!);
  }

  // Leave group
  async leaveGroup(chatId: string, userId: string) {
    // Check if chat exists and is a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.isGroup) {
      throw new Error("This is not a group chat");
    }

    // Check if user is in the group
    const participant = chat.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new Error("You are not a member of this group");
    }

    // Check if user is the last admin
    const adminCount = chat.participants.filter(
      (p) => p.role === "ADMIN"
    ).length;
    if (participant.role === "ADMIN" && adminCount === 1) {
      throw new Error(
        "You are the last admin. Please assign another admin before leaving"
      );
    }

    // Remove user from group
    await prisma.chatParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    return {
      success: true,
      message: "Left group successfully",
    };
  }

  // Update group description
  async updateGroupDescription(chatId: string, userId: string, description: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || !chat.isGroup) {
      throw new Error("Group chat not found");
    }

    const participant = chat.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new Error("You are not a member of this group");
    }

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { description },
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

    return this.formatChatResponse(updated);
  }

  // Update group avatar
  async updateGroupAvatar(chatId: string, userId: string, avatarUrl: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || !chat.isGroup) {
      throw new Error("Group chat not found");
    }

    const participant = chat.participants.find((p) => p.userId === userId);
    if (!participant || participant.role !== "ADMIN") {
      throw new Error("Only admins can update group avatar");
    }

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { avatar: avatarUrl },
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

    return this.formatChatResponse(updated);
  }
}

export const chatService = new ChatService();