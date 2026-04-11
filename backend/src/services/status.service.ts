import { prisma } from "../configs/database.js";

export class StatusService {
  //* Create a status update
  async createStatus(
    userId: string,
    content?: string,
    mediaUrl?: string,
    type: "TEXT" | "IMAGE" | "VIDEO" = "TEXT",
  ) {
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

  //* Get all statuses from contacts (users you chat with)
  async getStatuses(userId: string) {
    const contactIds = await this.getContactIds(userId);

    if (contactIds.length === 0) return [];

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

    const groupedByUser: Record<string, any[]> = {};
    statuses.forEach((status) => {
      if (!groupedByUser[status.userId]) {
        groupedByUser[status.userId] = [];
      }
      groupedByUser[status.userId].push(status);
    });

    return Object.entries(groupedByUser).map(([, userStatuses]) => ({
      user: userStatuses[0].user,
      statuses: userStatuses,
    }));
  }

  //* Get user's own statuses
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

  //* Get contact IDs (users sharing a chat with the given user)
  async getContactIds(userId: string): Promise<string[]> {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      select: {
        participants: {
          where: { userId: { not: userId } },
          select: { userId: true },
        },
      },
    });

    const sharedChatContactIds = [
      ...new Set(chats.flatMap((c) => c.participants.map((p) => p.userId))),
    ];

    // Fallback: if no shared-chat contacts exist, use all app users
    // except self and mutually blocked users.
    if (sharedChatContactIds.length > 0) {
      return sharedChatContactIds;
    }

    const allReachableUsers = await prisma.user.findMany({
      where: {
        id: { not: userId },
        AND: [
          { blockedUsers: { none: { blockedId: userId } } }, // they did not block me
          { blockedBy: { none: { blockerId: userId } } }, // I did not block them
        ],
      },
      select: { id: true },
    });

    return allReachableUsers.map((u) => u.id);
  }

  //* Check if viewer is a contact of the status owner
  private async isContact(
    statusOwnerId: string,
    viewerId: string,
  ): Promise<boolean> {
    const sharedChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: statusOwnerId } } },
          { participants: { some: { userId: viewerId } } },
        ],
      },
      select: { id: true },
    });
    return !!sharedChat;
  }

  //* View a status
  async viewStatus(statusId: string, userId: string) {
    const status = await prisma.status.findUnique({
      where: { id: statusId },
      select: { userId: true },
    });

    if (!status) throw new Error("Status not found");
    if (status.userId !== userId) {
      const contact = await this.isContact(status.userId, userId);
      if (!contact) throw new Error("Status not found");
    }

    const existingView = await prisma.statusView.findUnique({
      where: {
        statusId_userId: { statusId, userId },
      },
    });

    if (existingView) {
      return { ...existingView, status };
    }

    const view = await prisma.statusView.create({
      data: { statusId, userId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return { ...view, status };
  }

  //* Add reaction to status
  async addReaction(statusId: string, userId: string, emoji: string) {
    const status = await prisma.status.findUnique({
      where: { id: statusId },
      select: { userId: true },
    });

    if (!status) throw new Error("Status not found");
    if (status.userId !== userId) {
      const contact = await this.isContact(status.userId, userId);
      if (!contact) throw new Error("Status not found");
    }

    const existing = await prisma.statusReaction.findUnique({
      where: {
        statusId_userId: { statusId, userId },
      },
    });

    if (existing) {
      const updated = await prisma.statusReaction.update({
        where: { id: existing.id },
        data: { emoji },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });
      return { ...updated, status };
    }

    const reaction = await prisma.statusReaction.create({
      data: { statusId, userId, emoji },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return { ...reaction, status };
  }

  //* Remove reaction from status
  async removeReaction(statusId: string, userId: string) {
    const status = await prisma.status.findUnique({
      where: { id: statusId },
      select: { userId: true },
    });

    if (!status) throw new Error("Status not found");
    if (status.userId !== userId) {
      const contact = await this.isContact(status.userId, userId);
      if (!contact) throw new Error("Status not found");
    }

    await prisma.statusReaction.deleteMany({
      where: { statusId, userId },
    });

    return status;
  }

  //* Delete a status
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
