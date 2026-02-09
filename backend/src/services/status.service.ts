import { prisma } from "../configs/database.js";

export class StatusService {
  /**
   * Create a status update
   */
  async createStatus(
    userId: string,
    content?: string,
    mediaUrl?: string,
    type: "TEXT" | "IMAGE" | "VIDEO" = "TEXT"
  ) {
    // Status expires after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await prisma.status.create({
      data: {
        userId,
        content,
        mediaUrl,
        type,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return status;
  }

  /**
   * Get all statuses from contacts (users you chat with)
   */
  async getStatuses(userId: string) {
    // Get all users the current user has chats with
    const userChats = await prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatId: true },
    });

    const chatIds = userChats.map((cp) => cp.chatId);

    // Get all participants from these chats (excluding current user)
    const participants = await prisma.chatParticipant.findMany({
      where: {
        chatId: { in: chatIds },
        userId: { not: userId },
      },
      select: { userId: true },
    });

    const contactIds = [...new Set(participants.map((p) => p.userId))];

    // Get active statuses from contacts
    const statuses = await prisma.status.findMany({
      where: {
        userId: { in: contactIds },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        views: {
          where: { userId },
        },
        reactions: {
          where: { userId },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by user
    const groupedByUser: Record<string, any[]> = {};
    statuses.forEach((status) => {
      if (!groupedByUser[status.userId]) {
        groupedByUser[status.userId] = [];
      }
      groupedByUser[status.userId].push(status);
    });

    return Object.entries(groupedByUser).map(([userId, userStatuses]) => ({
      user: userStatuses[0].user,
      statuses: userStatuses,
    }));
  }

  /**
   * Get user's own statuses
   */
  async getMyStatuses(userId: string) {
    const statuses = await prisma.status.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return statuses;
  }

  /**
   * View a status
   */
  async viewStatus(statusId: string, userId: string) {
    // Check if already viewed
    const existingView = await prisma.statusView.findUnique({
      where: {
        statusId_userId: {
          statusId,
          userId,
        },
      },
    });

    if (existingView) {
      return existingView;
    }

    // Create view
    const view = await prisma.statusView.create({
      data: {
        statusId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return view;
  }

  /**
   * Add reaction to status
   */
  async addReaction(statusId: string, userId: string, emoji: string) {
    // Check if reaction already exists
    const existing = await prisma.statusReaction.findUnique({
      where: {
        statusId_userId: {
          statusId,
          userId,
        },
      },
    });

    if (existing) {
      // Update existing reaction
      return await prisma.statusReaction.update({
        where: { id: existing.id },
        data: { emoji },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
    }

    // Create new reaction
    return await prisma.statusReaction.create({
      data: {
        statusId,
        userId,
        emoji,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * Remove reaction from status
   */
  async removeReaction(statusId: string, userId: string) {
    await prisma.statusReaction.deleteMany({
      where: {
        statusId,
        userId,
      },
    });
  }

  /**
   * Delete a status
   */
  async deleteStatus(statusId: string, userId: string) {
    const status = await prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new Error("Status not found");
    }

    if (status.userId !== userId) {
      throw new Error("You can only delete your own status");
    }

    await prisma.status.delete({
      where: { id: statusId },
    });

    return { success: true, message: "Status deleted" };
  }
}

export const statusService = new StatusService();
