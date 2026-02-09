import { prisma } from "../configs/database.js";

export class MessageService {
    // Delete a message (soft delete)
    async deleteMessage(messageId: string, userId: string) {
        // Verify message exists and user is the sender
        const message = await prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            throw new Error("Message not found");
        }

        if (message.senderId !== userId) {
            throw new Error("You can only delete your own messages");
        }

        // Soft delete by updating content and adding deleted flag
        const deletedMessage = await prisma.message.update({
            where: { id: messageId },
            data: {
                content: "This message was deleted",
                status: "SENT", // Keep original status for now
            },
        });

        return deletedMessage;
    }

    // Mark all messages in a chat as read
    async markChatAsRead(chatId: string, userId: string) {
        // Update all unread messages in the chat that were NOT sent by the current user
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

    // Get unread message count for a specific chat
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

    // Get unread counts for all user's chats
    async getAllUnreadCounts(userId: string) {
        // Get all chats the user is part of
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

        // Format response
        return unreadMessages.map((item) => ({
            chatId: item.chatId,
            count: item._count.id,
        }));
    }

    // Edit a message
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

    // Add reaction to message
    async addReaction(messageId: string, userId: string, emoji: string) {
        // Check if reaction already exists
        const existing = await prisma.messageReaction.findUnique({
            where: {
                messageId_userId: {
                    messageId,
                    userId,
                },
            },
        });

        if (existing) {
            // Update existing reaction
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

    // Remove reaction from message
    async removeReaction(messageId: string, userId: string) {
        await prisma.messageReaction.deleteMany({
            where: {
                messageId,
                userId,
            },
        });
    }

    // Pin a message
    async pinMessage(messageId: string, chatId: string, userId: string) {
        // Verify user is admin or member of the chat
        const participant = await prisma.chatParticipant.findFirst({
            where: {
                chatId,
                userId,
            },
        });

        if (!participant) {
            throw new Error("You are not a participant in this chat");
        }

        // Unpin previous pinned message in this chat
        await prisma.message.updateMany({
            where: {
                chatId,
                pinnedAt: { not: null },
            },
            data: {
                pinnedAt: null,
            },
        });

        // Pin the new message
        const pinned = await prisma.message.update({
            where: { id: messageId },
            data: {
                pinnedAt: new Date(),
            },
            include: {
                sender: { select: { id: true, name: true, avatar: true } },
            },
        });

        return pinned;
    }

    // Unpin a message
    async unpinMessage(messageId: string, chatId: string, userId: string) {
        const participant = await prisma.chatParticipant.findFirst({
            where: {
                chatId,
                userId,
            },
        });

        if (!participant) {
            throw new Error("You are not a participant in this chat");
        }

        const unpinned = await prisma.message.update({
            where: { id: messageId },
            data: {
                pinnedAt: null,
            },
        });

        return unpinned;
    }

    // Get pinned message for a chat
    async getPinnedMessage(chatId: string) {
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
