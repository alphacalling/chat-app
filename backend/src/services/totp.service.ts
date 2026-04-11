import { prisma } from "../configs/database.js";
import {
  generateTOTPSecret,
  verifyTOTP,
  verifyBackupCode,
  generateQRCode,
} from "../utils/totp.js";
import { encrypt, decrypt, isEncrypted } from "../utils/encryption.js";

export class TOTPService {
  //* Enable TOTP for a user
  async enableTOTP(
    userId: string,
  ): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.totpEnabled) {
      throw new Error("TOTP is already enabled");
    }

    const config = generateTOTPSecret(
      user.email || user.phone,
      "Chit-Chat App",
    );
    const qrCode = await generateQRCode(config.qrCodeUrl);

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: encrypt(config.secret),
        totpBackupCodes: encrypt(config.backupCodes.join(",")),
      },
    });

    return {
      secret: config.secret,
      qrCode,
      backupCodes: config.backupCodes,
    };
  }

  //* Verify and enable TOTP (final step)
  async verifyAndEnableTOTP(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpSecret) {
      throw new Error("TOTP secret not found. Please generate it first.");
    }

    const secret = isEncrypted(user.totpSecret)
      ? decrypt(user.totpSecret)
      : user.totpSecret;

    const backupCodes =
      user.totpBackupCodes && isEncrypted(user.totpBackupCodes)
        ? decrypt(user.totpBackupCodes)
        : user.totpBackupCodes;

    let isValid = verifyTOTP(token, secret);
    let updatedBackupCodes: string | null = null;

    if (!isValid && backupCodes) {
      const result = verifyBackupCode(token, backupCodes);
      isValid = result.valid;
      if (result.valid) {
        updatedBackupCodes = result.remainingCodes;
      }
    }

    if (!isValid) {
      throw new Error("Invalid TOTP token");
    }

    const updateData: any = { totpEnabled: true };
    if (updatedBackupCodes !== null) {
      updateData.totpBackupCodes = encrypt(updatedBackupCodes);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  //* disableTOTP
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

    const secret = isEncrypted(user.totpSecret)
      ? decrypt(user.totpSecret)
      : user.totpSecret;

    const backupCodes =
      user.totpBackupCodes && isEncrypted(user.totpBackupCodes)
        ? decrypt(user.totpBackupCodes)
        : user.totpBackupCodes;

    let isValid = verifyTOTP(token, secret);
    if (!isValid && backupCodes) {
      const result = verifyBackupCode(token, backupCodes);
      isValid = result.valid;
    }

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

  //* verifyTOTPLogin
  async verifyTOTPLogin(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return false;
    }

    const secret = isEncrypted(user.totpSecret)
      ? decrypt(user.totpSecret)
      : user.totpSecret;

    const backupCodes =
      user.totpBackupCodes && isEncrypted(user.totpBackupCodes)
        ? decrypt(user.totpBackupCodes)
        : user.totpBackupCodes;

    if (verifyTOTP(token, secret)) {
      return true;
    }

    if (backupCodes) {
      const result = verifyBackupCode(token, backupCodes);
      if (result.valid) {
        await prisma.user.update({
          where: { id: userId },
          data: { totpBackupCodes: encrypt(result.remainingCodes) },
        });
        return true;
      }
    }

    return false;
  }
}

export const totpService = new TOTPService();
