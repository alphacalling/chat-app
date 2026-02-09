import { join } from "path";
import { fileURLToPath } from "url";

// When running with tsx from backend/, __dirname in server.ts is src/
// When running with tsx from backend/, __dirname in fileUpload.ts is src/utils/
// This function ensures we always get the correct backend root
export function getBackendRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = __filename.substring(0, __filename.lastIndexOf("/"));
  
  // If this file is in src/utils/, go up two levels
  // If this file is in src/, go up one level
  if (__dirname.includes("utils")) {
    return join(__dirname, "../..");
  }
  return join(__dirname, "..");
}

// Get the uploads directory path
export function getUploadsDir(): string {
  return join(getBackendRoot(), "uploads");
}
