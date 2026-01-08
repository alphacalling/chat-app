// import { PrismaClient } from '@prisma/client';

// // PrismaClient singleton pattern
// // Development me multiple instances ban jate hai hot reload ki wajah se
// // Ye pattern usse prevent karta hai

// declare global {
//   var prisma: PrismaClient | undefined;
// }

// export const prisma = global.prisma || new PrismaClient({
//   log: process.env.NODE_ENV === 'development'
//     ? ['query', 'error', 'warn']
//     : ['error'],
// });

// if (process.env.NODE_ENV !== 'production') {
//   global.prisma = prisma;
// }

// // Database connection test
// export async function connectDatabase(): Promise<void> {
//   try {
//     await prisma.$connect();
//     console.log('✅ Database connected successfully');
//   } catch (error) {
//     console.error('❌ Database connection failed:', error);
//     process.exit(1);
//   }
// }

// // Graceful shutdown
// export async function disconnectDatabase(): Promise<void> {
//   await prisma.$disconnect();
//   console.log('📤 Database disconnected');
// }

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { Pool } from "pg";

// env load
dotenv.config();

console.log("process.env.DATABASE_URL....", process.env.DATABASE_URL);

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// PrismaClient singleton (dev hot reload safe)
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Database connection test
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log("📤 Database disconnected");
}

// src/config/database.ts

// import { PrismaClient } from '@prisma/client';

// declare global {
//   var prisma: PrismaClient | undefined;
// }

// export const prisma = globalThis.prisma || new PrismaClient({
//   log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
// });

// if (process.env.NODE_ENV !== 'production') {
//   globalThis.prisma = prisma;
// }

// export async function connectDatabase(): Promise<void> {
//   try {
//     await prisma.$connect();
//     console.log('✅ Database connected');
//   } catch (error) {
//     console.error('❌ Database connection failed:', error);
//     process.exit(1);
//   }
// }

// export async function disconnectDatabase(): Promise<void> {
//   await prisma.$disconnect();
//   console.log('📤 Database disconnected');
// }
