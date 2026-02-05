import speakeasy from "speakeasy";
import QRCode from "qrcode";

export interface TOTPConfig {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Generate TOTP secret and QR code for a user
 */
export function generateTOTPSecret(userEmail: string, appName: string = "WhatsApp Clone"): TOTPConfig {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${userEmail})`,
    issuer: appName,
    length: 32,
  });

  // Generate backup codes (10 codes, 8 digits each)
  const backupCodes = Array.from({ length: 10 }, () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
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
 * Verify backup code
 */
export function verifyBackupCode(code: string, backupCodes: string): boolean {
  const codes = backupCodes.split(",");
  return codes.includes(code);
}
