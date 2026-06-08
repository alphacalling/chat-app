import { prisma } from "../configs/database.js";

export class MessageService {
  private async assertChatParticipant(chatId: string, userId: string) {
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });
    if (!participant) {
      throw new Error("You are not a participant in this chat");
    }
  }

  //* Delete a message for the current user only (hide from their view)
  async deleteMessageForMe(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    await this.assertChatParticipant(message.chatId, userId);

    await prisma.messageHidden.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      create: { messageId, userId },
      update: {},
    });

    return { scope: "me" as const, messageId, chatId: message.chatId };
  }

  //* Delete a message for everyone (soft delete — sender only)
  async deleteMessageForEveryone(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    await this.assertChatParticipant(message.chatId, userId);

    if (message.senderId !== userId) {
      throw new Error("You can only delete your own messages for everyone");
    }

    const deletedMessage = await prisma.message.update({
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

    return {
      scope: "everyone" as const,
      message: deletedMessage,
      chatId: message.chatId,
    };
  }

  async deleteMessage(
    messageId: string,
    userId: string,
    scope: "me" | "everyone",
  ) {
    if (scope === "me") {
      return this.deleteMessageForMe(messageId, userId);
    }
    return this.deleteMessageForEveryone(messageId, userId);
  }

  async getHiddenMessageIds(userId: string, chatId: string): Promise<string[]> {
    const hidden = await prisma.messageHidden.findMany({
      where: {
        userId,
        message: { chatId },
      },
      select: { messageId: true },
    });
    return hidden.map((row) => row.messageId);
  }

  //* Mark all messages in a chat as read
  async markChatAsRead(chatId: string, userId: string) {
    const result = await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        status: { in: ["SENT", "DELIVERED"] },
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });

    return {
      count: result.count,
      chatId,
    };
  }

  //* Get unread message count for a specific chat
  async getUnreadCount(chatId: string, userId: string) {
    const count = await prisma.message.count({
      where: {
        chatId,
        senderId: { not: userId },
        status: { in: ["SENT", "DELIVERED"] },
      },
    });

    return count;
  }

  //* Get unread counts for all user's chats
  async getAllUnreadCounts(userId: string) {
    const userChats = await prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatId: true },
    });

    const chatIds = userChats.map((cp) => cp.chatId);

    // Get unread messages grouped by chat
    const unreadMessages = await prisma.message.groupBy({
      by: ["chatId"],
      where: {
        chatId: { in: chatIds },
        senderId: { not: userId },
        status: { in: ["SENT", "DELIVERED"] },
      },
      _count: {
        id: true,
      },
    });

    return unreadMessages.map((item) => ({
      chatId: item.chatId,
      count: item._count.id,
    }));
  }

  //* Edit a message
  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== userId) {
      throw new Error("You can only edit your own messages");
    }

    if (message.type !== "TEXT") {
      throw new Error("Only text messages can be edited");
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
        editedAt: new Date(),
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
    });

    return updated;
  }

  //* addReaction
  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new Error("Message not found");

    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId: message.chatId, userId },
    });
    if (!participant) throw new Error("You are not a participant in this chat");

    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (existing) {
      return await prisma.messageReaction.update({
        where: { id: existing.id },
        data: { emoji },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });
    }

    // Create new reaction
    return await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  //* removeReaction
  async removeReaction(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new Error("Message not found");

    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId: message.chatId, userId },
    });
    if (!participant) throw new Error("You are not a participant in this chat");

    await prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
      },
    });
  }

  //* pinMessage
  async pinMessage(messageId: string, chatId: string, userId: string) {
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });
    if (!participant) {
      throw new Error("You are not a participant in this chat");
    }

    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
    });
    if (!message) {
      throw new Error("Message not found in this chat");
    }

    await prisma.message.updateMany({
      where: { chatId, pinnedAt: { not: null } },
      data: { pinnedAt: null },
    });

    const pinned = await prisma.message.update({
      where: { id: messageId },
      data: { pinnedAt: new Date() },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    return pinned;
  }

  //* unpinMessage
  async unpinMessage(messageId: string, chatId: string, userId: string) {
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });
    if (!participant) {
      throw new Error("You are not a participant in this chat");
    }

    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
    });
    if (!message) {
      throw new Error("Message not found in this chat");
    }

    const unpinned = await prisma.message.update({
      where: { id: messageId },
      data: { pinnedAt: null },
    });

    return unpinned;
  }

  //* getPinnedMessage
  async getPinnedMessage(chatId: string, userId: string) {
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });
    if (!participant) {
      throw new Error("You are not a participant in this chat");
    }

    return await prisma.message.findFirst({
      where: {
        chatId,
        pinnedAt: { not: null },
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: {
        pinnedAt: "desc",
      },
    });
  }
}

export const messageService = new MessageService();
