import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This file lives at backend/src/utils/paths.ts — go up two levels to reach backend/
export function getBackendRoot(): string {
  return join(__dirname, "..", "..");
}

export function getUploadsDir(): string {
  return join(getBackendRoot(), "uploads");
}
