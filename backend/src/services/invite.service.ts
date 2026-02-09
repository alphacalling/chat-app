import { prisma } from "../configs/database.js";
import { randomBytes } from "crypto";

export class InviteService {
  /**
   * Generate a unique invite code
   */
  private generateInviteCode(): string {
    return randomBytes(8).toString("hex").toUpperCase();
  }

  /**
   * Create an invite link for a group
   */
  async createInviteLink(
    chatId: string,
    createdBy: string,
    expiresAt?: Date,
    maxUses?: number
  ) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || !chat.isGroup) {
      throw new Error("Group chat not found");
    }

    const participant = chat.participants.find((p) => p.userId === createdBy);
    if (!participant || participant.role !== "ADMIN") {
      throw new Error("Only admins can create invite links");
    }

    const code = this.generateInviteCode();

    const inviteLink = await prisma.inviteLink.create({
      data: {
        chatId,
        code,
        createdBy,
        expiresAt,
        maxUses,
      },
    });

    return inviteLink;
  }

  /**
   * Get all invite links for a group
   */
  async getInviteLinks(chatId: string, userId: string) {
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

    const links = await prisma.inviteLink.findMany({
      where: { chatId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return links;
  }

  /**
   * Join group via invite link
   */
  async joinViaInviteLink(code: string, userId: string) {
    const inviteLink = await prisma.inviteLink.findUnique({
      where: { code },
      include: {
        chat: {
          include: { participants: true },
        },
      },
    });

    if (!inviteLink) {
      throw new Error("Invalid invite link");
    }

    if (!inviteLink.isActive) {
      throw new Error("Invite link is no longer active");
    }

    // Check expiration
    if (inviteLink.expiresAt && inviteLink.expiresAt < new Date()) {
      throw new Error("Invite link has expired");
    }

    // Check max uses
    if (inviteLink.maxUses && inviteLink.useCount >= inviteLink.maxUses) {
      throw new Error("Invite link has reached maximum uses");
    }

    // Check if user is already in the group
    const alreadyMember = inviteLink.chat.participants.some(
      (p) => p.userId === userId
    );
    if (alreadyMember) {
      throw new Error("You are already a member of this group");
    }

    // Add user to group
    await prisma.chatParticipant.create({
      data: {
        chatId: inviteLink.chatId,
        userId,
        role: "MEMBER",
      },
    });

    // Increment use count
    await prisma.inviteLink.update({
      where: { id: inviteLink.id },
      data: { useCount: inviteLink.useCount + 1 },
    });

    // Get updated chat
    const chat = await prisma.chat.findUnique({
      where: { id: inviteLink.chatId },
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
        },
      },
    });

    return chat;
  }

  /**
   * Revoke an invite link
   */
  async revokeInviteLink(linkId: string, userId: string) {
    const inviteLink = await prisma.inviteLink.findUnique({
      where: { id: linkId },
      include: {
        chat: {
          include: { participants: true },
        },
      },
    });

    if (!inviteLink) {
      throw new Error("Invite link not found");
    }

    const participant = inviteLink.chat.participants.find(
      (p) => p.userId === userId
    );
    if (!participant || participant.role !== "ADMIN") {
      throw new Error("Only admins can revoke invite links");
    }

    await prisma.inviteLink.update({
      where: { id: linkId },
      data: { isActive: false },
    });

    return { success: true, message: "Invite link revoked" };
  }
}

export const inviteService = new InviteService();
