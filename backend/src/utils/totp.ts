import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { randomBytes } from "crypto";

export interface TOTPConfig {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export function generateTOTPSecret(userEmail: string, appName: string = "WhatsApp Clone"): TOTPConfig {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${userEmail})`,
    issuer: appName,
    length: 32,
  });

  const backupCodes = Array.from({ length: 10 }, () => {
    const buf = randomBytes(4);
    const num = (buf.readUInt32BE(0) % 90000000) + 10000000;
    return num.toString();
  });

  return {
    secret: secret.base32!,
    qrCodeUrl: secret.otpauth_url!,
    backupCodes,
  };
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2,
  });
}

/**
 * Verify backup code and return remaining codes (null if not valid).
 */
export function verifyBackupCode(code: string, backupCodes: string): { valid: boolean; remainingCodes: string } {
  const codes = backupCodes.split(",");
  const index = codes.indexOf(code);
  if (index === -1) {
    return { valid: false, remainingCodes: backupCodes };
  }
  codes.splice(index, 1);
  return { valid: true, remainingCodes: codes.join(",") };
}
