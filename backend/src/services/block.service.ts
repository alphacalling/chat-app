import { prisma } from "../configs/database.js";

export class BlockService {
  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new Error("Cannot block yourself");
    }

    // Check if already blocked
    const existing = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existing) {
      throw new Error("User is already blocked");
    }

    await prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId,
      },
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await prisma.blockedUser.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });
  }

  /**
   * Get blocked users list
   */
  async getBlockedUsers(userId: string) {
    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return blocked.map((b) => b.blocked);
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const blocked = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return !!blocked;
  }
}

export const blockService = new BlockService();
