import { logger } from "../utils/logger.js";

const requiredVars = [
    "DATABASE_URL",
    "CLIENT_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ] as const;
  
  const optionalVars: Record<string, string> = {
    PORT: "5000",
    NODE_ENV: "development",
    DB_POOL_MAX: "20",
    DB_POOL_MIN: "5",
    LOG_LEVEL: "info",
  };

  export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName]!.trim() === "") {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    logger.fatal(message);
    throw new Error(message);
  }

  for (const [key, defaultValue] of Object.entries(optionalVars)) {
    if (!process.env[key]) {
      logger.warn({ variable: key, default: defaultValue },
        "Environment variable not set, using default"
      );
    }
  }

  // Validate DATABASE_URL format
  try {
    new URL(process.env.DATABASE_URL!);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  // Validate CLIENT_URL format
  try {
    new URL(process.env.CLIENT_URL!);
  } catch {
    throw new Error("CLIENT_URL is not a valid URL");
  }

  logger.info("Environment validated successfully");
}