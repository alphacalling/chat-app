import type { Request } from "express";

export interface FileRequest extends Request {
  file?: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}

// Simple in-memory file parser for multipart/form-data
export async function parseFormData(req: Request): Promise<{
  fields: Record<string, string>;
  file?: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}> {
  return new Promise((resolve, reject) => {
    let data = "";
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers["content-type"] || "";

        if (!contentType.includes("multipart/form-data")) {
          console.log("⚠️ Not multipart/form-data, skipping file parsing");
          resolve({ fields: {} });
          return;
        }

        // Simple boundary extraction
        const boundaryMatch = contentType.match(/boundary=([^;]*)/);
        if (!boundaryMatch || !boundaryMatch[1]) {
          console.error("❌ No boundary found in Content-Type:", contentType);
          resolve({ fields: {} });
          return;
        }

        const boundary = boundaryMatch[1].trim();
        if (!boundary) {
          console.error("❌ Empty boundary");
          resolve({ fields: {} });
          return;
        }

        console.log("🔍 Boundary:", boundary);
        const parts = buffer.toString("binary").split(`--${boundary}`);
        console.log("🔍 Parts count:", parts ? parts.length : 0);

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
          console.error("❌ No parts found after splitting");
          resolve({ fields: {} });
          return;
        }

        const fields: Record<string, string> = {};
        let file;

        // Filter out empty parts
        const validParts = parts.filter(part => part && typeof part === "string" && part.trim().length > 0);
        console.log("🔍 Valid parts count:", validParts.length);

        for (const part of validParts) {
          try {
            if (
              part.includes("Content-Disposition") &&
              part.includes("filename=")
            ) {
              // This is a file
              const fileMatch = part.match(/filename="([^"]+)"/);
              const typeMatch = part.match(/Content-Type: ([^\r\n]+)/);

              if (fileMatch && typeMatch && fileMatch[1] && typeMatch[1]) {
                const fileName = fileMatch[1];
                const mimeType = typeMatch[1].trim() || "image/jpeg";
                const fileDataStart =
                  part.indexOf("\r\n\r\n") !== -1
                    ? part.indexOf("\r\n\r\n") + 4
                    : part.indexOf("\n\n") + 2;
                const fileDataEnd = part.lastIndexOf("\r\n");

                if (fileDataStart > 0 && fileDataEnd > fileDataStart) {
                  const fileBuffer = Buffer.from(
                    part.substring(fileDataStart, fileDataEnd),
                    "binary"
                  );

                  if (fileBuffer && fileBuffer.length > 0) {
                    file = {
                      originalname: fileName,
                      mimetype: mimeType,
                      size: fileBuffer.length,
                      buffer: fileBuffer,
                    };
                    console.log("✅ File parsed:", fileName, mimeType, fileBuffer.length, "bytes");
                  } else {
                    console.error("❌ File buffer is empty");
                  }
                } else {
                  console.error("❌ Invalid file data boundaries:", { fileDataStart, fileDataEnd });
                }
              } else {
                if (!fileMatch) console.warn("⚠️ No fileMatch");
                if (!typeMatch) console.warn("⚠️ No typeMatch");
                if (fileMatch && !fileMatch[1]) console.warn("⚠️ fileMatch[1] is undefined");
                if (typeMatch && !typeMatch[1]) console.warn("⚠️ typeMatch[1] is undefined");
              }
            } else if (part.includes("Content-Disposition")) {
              // This is a field
              const nameMatch = part.match(/name="([^"]+)"/);
              if (nameMatch && nameMatch[1]) {
                const fieldName = nameMatch[1];
                const valueStart = part.indexOf("\r\n\r\n");
                const valueEnd = part.lastIndexOf("\r\n");

                if (valueStart !== -1 && valueEnd > valueStart) {
                  const value = part.substring(valueStart + 4, valueEnd).trim();
                  fields[fieldName] = value;
                }
              }
            }
          } catch (partError) {
            console.error("❌ Error processing part:", partError);
            console.error("❌ Part content (first 100 chars):", part?.substring(0, 100));
          }
        }

        resolve({ fields, file });
      } catch (error) {
        console.error("❌ Error in parseFormData:", error);
        console.error("❌ Error stack:", error instanceof Error ? error.stack : String(error));
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

// Middleware to attach file to req.file
export async function fileUploadMiddleware(
  req: Request,
  _res,
  next
): Promise<void> {
  try {
    console.log("🔍 fileUploadMiddleware called");
    console.log("🔍 Content-Type:", req.headers["content-type"]);
    
    const { fields, file } = await parseFormData(req);
    
    console.log("🔍 Parsed fields:", Object.keys(fields));
    console.log("🔍 File parsed:", file ? "YES" : "NO");
    if (file) {
      console.log("🔍 File details:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer
      });
    }

    // Attach parsed fields to body
    req.body = { ...req.body, ...fields };

    // Attach file if present
    if (file) {
      (req as any).file = file;
    } else {
      console.warn("⚠️ No file found in request");
    }

    next();
  } catch (error) {
    console.error("❌ Error parsing form data:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : String(error));
    next(error);
  }
}
