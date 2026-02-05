import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import routes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import messageRoutes from "./routes/message.route.js";
import totpRoutes from "./routes/totp.route.js";
import blockRoutes from "./routes/block.route.js";
import inviteRoutes from "./routes/invite.route.js";
import statusRoutes from "./routes/status.route.js";
import { setupSocket } from "./socket/socket.js";
import { setIO } from "./utils/socket.js";

import { connectDatabase, disconnectDatabase } from "./configs/database.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "./types/type.js";
import { getUploadsDir } from "./utils/paths.js";

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.substring(0, __filename.lastIndexOf("/"));

// Load environment variables
dotenv.config();

// Initialize Express
const app: Express = express();
const httpServer = createServer(app);

// Initialize Socket.IO with TypeScript types
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Connection options
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser()); // Parse cookies
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Determine uploads directory path using shared utility
// This ensures consistency with fileUpload.ts
const uploadsPath = getUploadsDir();
// Ensure directory exists
mkdirSync(uploadsPath, { recursive: true });
console.log("📁 Static file serving directory:", uploadsPath);

app.use(
  "/uploads",
  (req, res, next) => {
    console.log("📁 File request:", req.path);
    next();
  },
  express.static(uploadsPath, {
    setHeaders: (res, path) => {
      res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL || "http://localhost:5173");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      // proper content type for downloads
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
      } else if (path.endsWith(".doc") || path.endsWith(".docx")) {
        res.setHeader("Content-Type", "application/msword");
      } else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (path.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (path.endsWith(".gif")) {
        res.setHeader("Content-Type", "image/gif");
      }
    },
  })
);

// Request logging middleware
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.path}`);
  next();
});

// API Routes
app.use("/api", routes); //api/user/:userId
app.use("/api/message", messageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/totp", totpRoutes);
app.use("/api/block", blockRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/status", statusRoutes);

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "WhatsApp Clone API" });
});

// Test route to verify routing works
app.get("/api/test-user-route", (req: Request, res: Response) => {
  res.json({ success: true, message: "Test route works!" });
});

// 404 Handler (skip for static file requests)
app.use((req: Request, res: Response) => {
  // If it's a static file request that wasn't found, return 404 without JSON
  if (req.path.startsWith("/uploads")) {
    res.status(404).send("File not found");
    return;
  }
  // For API routes, return JSON
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Socket.IO handlers
setupSocket(io);
setIO(io); // Store io instance for use in controllers

// Start server
const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    // database Connection
    await connectDatabase();

    // start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// shutdown handling
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down...");
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down...");
  await disconnectDatabase();
  process.exit(0);
});

// Start the server
startServer();

export { app, io };
