import { randomBytes } from "crypto";
import { createWriteStream, mkdirSync } from "fs";
import { join } from "path";
import { getUploadsDir } from "./paths.js";

// Use shared path utility to ensure consistency
const UPLOAD_DIR = getUploadsDir();

// Ensure uploads directory exists
try {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 File upload directory:", UPLOAD_DIR);
} catch (error) {
  console.error("❌ Error creating uploads directory:", error);
}

export interface FileUploadOptions {
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

export function generateFileName(originalName: string): string {
  if (!originalName || typeof originalName !== "string") {
    throw new Error("Invalid original file name");
  }
  
  try {
    const parts = originalName.split(".");
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      throw new Error("Invalid file name format");
    }
    
    const ext = parts.length > 1 && parts[parts.length - 1] 
      ? parts[parts.length - 1] 
      : "jpg"; // Default to jpg if no extension
    const random = randomBytes(8).toString("hex");
    const timestamp = Date.now();
    return `${timestamp}-${random}.${ext}`;
  } catch (error) {
    console.error("❌ Error in generateFileName:", error);
    // Fallback: use timestamp and random with jpg extension
    const random = randomBytes(8).toString("hex");
    const timestamp = Date.now();
    return `${timestamp}-${random}.jpg`;
  }
}

export function getFileUploadPath(fileName: string): string {
  return join(UPLOAD_DIR, fileName);
}

export function getFileServingPath(fileName: string): string {
  return `/uploads/${fileName}`;
}

export function getFullFileUrl(filePathOrFileName: string | undefined | null, baseUrl?: string): string {
  // Handle null/undefined
  if (!filePathOrFileName) {
    return "";
  }
  
  // If it's already a full URL, return it as is
  if (filePathOrFileName.startsWith("http://") || filePathOrFileName.startsWith("https://")) {
    return filePathOrFileName;
  }
  
  // If it's already a full path like /uploads/file.jpg, use it directly
  // If it's just a filename, convert it to a path
  let relativePath = filePathOrFileName;
  if (!relativePath.startsWith("/")) {
    relativePath = getFileServingPath(relativePath);
  }
  
  // Ensure it starts with /uploads
  if (!relativePath.startsWith("/uploads/")) {
    // Extract just the filename if it contains /uploads/
    let filename: string;
    if (relativePath.includes("/uploads/")) {
      const parts = relativePath.split("/uploads/");
      filename = (parts.length > 1 && parts[1]) ? parts[1] : (parts[0] || relativePath);
    } else {
      filename = relativePath.replace("/uploads", "").replace(/^\//, "") || relativePath;
    }
    relativePath = `/uploads/${filename}`;
  }
  
  if (baseUrl) {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}${relativePath}`;
  }
  // Default to localhost:5000 if no baseUrl provided
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}${relativePath}`;
}

export async function saveFile(
  buffer: Buffer,
  originalFileName: string,
  options: FileUploadOptions = {}
): Promise<{
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}> {
  try {
    console.log("🔍 saveFile called with:", {
      originalFileName,
      bufferLength: buffer?.length,
      hasBuffer: !!buffer
    });

    if (!originalFileName || typeof originalFileName !== "string") {
      throw new Error("Invalid originalFileName: " + String(originalFileName));
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error("Invalid buffer provided");
    }

    const fileName = generateFileName(originalFileName);
    console.log("🔍 Generated fileName:", fileName);
    
    const filePath = getFileUploadPath(fileName);
    const fileUrl = getFileServingPath(fileName);
    
    console.log("🔍 File paths:", { filePath, fileUrl });

    // Write file to disk
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.on("error", (err) => {
        console.error("❌ Error writing file:", err);
        console.error("   File path:", filePath);
        reject(err);
      });
      stream.on("finish", () => {
        console.log("✅ File saved:", fileName, "at", filePath);
        resolve();
      });
      stream.write(buffer);
      stream.end();
    });

    return {
      fileName,
      fileUrl,
      fileSize: buffer.length,
      mimeType: options.mimeType || "application/octet-stream",
    };
  } catch (error) {
    console.error("Error saving file:", error);
    throw new Error("Failed to save file");
  }
}
