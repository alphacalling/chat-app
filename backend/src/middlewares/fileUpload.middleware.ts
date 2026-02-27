import type { Request } from "express";
import multer from "multer";

export interface FileRequest extends Request {
  file?: Express.Multer.File;
}

// Use multer with in-memory storage so we can stream to Cloudinary
const storage = multer.memoryStorage();

// Set some sensible defaults; you can tweak as needed
export const fileUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max per file
  },
}).single("file");
