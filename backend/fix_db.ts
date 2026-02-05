// import { Pool } from "pg";
// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";

// // Load env vars
// dotenv.config({ path: path.join(process.cwd(), ".env") });

// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
// });

// async function runMigration() {
//     const client = await pool.connect();
//     try {
//         console.log("🔌 Connected to database...");

//         // 1. Fix Chat table
//         console.log("🛠️ Checking Chat table...");
//         await client.query(`
//       ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "name" TEXT;
//       ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN DEFAULT false;
//       ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
//     `);
//         console.log("✅ Chat table updated");

//         // 2. Fix Message table
//         console.log("🛠️ Checking Message table...");
//         await client.query(`
//       ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
//       ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
//       ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
//       ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
//     `);
//         console.log("✅ Message table updated");

//         console.log("✨ database fix completed successfully!");
//     } catch (error) {
//         console.error("❌ Migration failed:", error);
//     } finally {
//         client.release();
//         await pool.end();
//     }
// }

// runMigration();
