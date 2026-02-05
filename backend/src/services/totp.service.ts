import { prisma } from "../configs/database.js";
import { generateTOTPSecret, verifyTOTP, verifyBackupCode, generateQRCode } from "../utils/totp.js";

export class TOTPService {
  /**
   * Enable TOTP for a user
   */
  async enableTOTP(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.totpEnabled) {
      throw new Error("TOTP is already enabled");
    }

    const config = generateTOTPSecret(user.email || user.phone, "WhatsApp Clone");
    const qrCode = await generateQRCode(config.qrCodeUrl);

    // Store secret and backup codes (comma-separated)
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: config.secret,
        totpBackupCodes: config.backupCodes.join(","),
      },
    });

    return {
      secret: config.secret,
      qrCode,
      backupCodes: config.backupCodes,
    };
  }

  /**
   * Verify and enable TOTP (final step)
   */
  async verifyAndEnableTOTP(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpSecret) {
      throw new Error("TOTP secret not found. Please generate it first.");
    }

    const isValid = verifyTOTP(token, user.totpSecret) || 
                    (user.totpBackupCodes && verifyBackupCode(token, user.totpBackupCodes));

    if (!isValid) {
      throw new Error("Invalid TOTP token");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
      },
    });
  }

  /**
   * Disable TOTP for a user
   */
  async disableTOTP(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpEnabled) {
      throw new Error("TOTP is not enabled");
    }

    if (!user.totpSecret) {
      throw new Error("TOTP secret not found");
    }

    const isValid = verifyTOTP(token, user.totpSecret) || 
                    (user.totpBackupCodes && verifyBackupCode(token, user.totpBackupCodes));

    if (!isValid) {
      throw new Error("Invalid TOTP token");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
      },
    });
  }

  /**
   * Verify TOTP during login
   */
  async verifyTOTPLogin(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return false;
    }

    return verifyTOTP(token, user.totpSecret) || 
           (user.totpBackupCodes ? verifyBackupCode(token, user.totpBackupCodes) : false);
  }
}

export const totpService = new TOTPService();
