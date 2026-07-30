import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { execSync } from "node:child_process";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

// Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || "20"),
  min: parseInt(process.env.DB_POOL_MIN || "5"),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database pool error");
});

pool.on("connect", () => {
  logger.debug("New pool connection established");
});

const adapter = new PrismaPg(pool);

// Singleton pattern to prevent multiple instances in development (hot reload)
declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

//! Database Operations
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connected successfully");
  } catch (error) {
    logger.fatal({ err: error }, "Database connection failed");
    process.exit(1);
  }
}

//* disconnect db
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
    logger.info("Database disconnected and pool closed");
  } catch (error) {
    logger.error({ err: error }, "Error during database disconnect");
  }
}

//* db migration
export async function runMigrations(): Promise<void> {
  try {
    logger.info("Applying database migrations...");
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: process.env,
      timeout: 30000,
    });
    logger.info("Database migrations applied successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      logger.fatal({ err: error }, "Database migration failed");
      throw error;
    }
    logger.warn(
      { err: error },
      "Database migration failed (non-fatal in development). Run migrations manually if needed: npx prisma migrate deploy",
    );
  }
}

//* Health check db
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { pool };
