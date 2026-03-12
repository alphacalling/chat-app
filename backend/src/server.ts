import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { mkdirSync } from "fs";

dotenv.config();

import { logger } from "./utils/logger.js";
import { validateEnvironment } from "./configs/environment.js";
import {
  connectDatabase,
  disconnectDatabase,
  runMigrations,
  checkDatabaseHealth,
} from "./configs/database.js";
import { setupSecurity } from "./middlewares/security.js";
import { setupLogging } from "./middlewares/logging.js";

import routes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import messageRoutes from "./routes/message.route.js";
import totpRoutes from "./routes/totp.route.js";
import blockRoutes from "./routes/block.route.js";
import inviteRoutes from "./routes/invite.route.js";
import statusRoutes from "./routes/status.route.js";

import { setupSocket } from "./socket/socket.js";
import { setIO } from "./utils/socket.js";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "./types/type.js";

import { getUploadsDir } from "./utils/paths.js";

// Validate environment before doing anything
validateEnvironment();

// Constants
const PORT = parseInt(process.env.PORT || "5000", 10);
const CLIENT_URL = process.env.CLIENT_URL!;

// Initialize Express
const app: Express = express();
const httpServer = createServer(app);

//Initialize Socket.IO
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Middlewares Setup ───

// 1. Logging
setupLogging(app);

// 2. Security
setupSecurity(app);

// 3. Body parsing
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Static file serving
const uploadsPath = getUploadsDir();
mkdirSync(uploadsPath, { recursive: true });
logger.info({ path: uploadsPath }, "Static file serving directory");

app.use(
  "/uploads",
  express.static(uploadsPath, {
    maxAge: "1y",
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'"
      );
      res.setHeader(
        "Access-Control-Allow-Origin",
        CLIENT_URL
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
    },
  })
);

// ─── API Routes ───
app.use("/api", routes);
app.use("/api/message", messageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/totp", totpRoutes);
app.use("/api/block", blockRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/status", statusRoutes);

// ─── Health Check ────
app.get("/health", async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();

  const status = dbHealthy ? "healthy" : "unhealthy";
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? "connected" : "disconnected",
    version: process.env.npm_package_version || "unknown",
  });
});

// ─── Info Route ────
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Chit-Chat Application API" });
});

// ─── 404 Handler ────
app.use((req: Request, res: Response) => {
  if (req.path.startsWith("/uploads")) {
    res.status(404).send("File not found");
    return;
  }
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ─── Error Handler ──────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      body: req.body,
    },
    "Unhandled error"
  );

  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "Internal server error";

  res.status(500).json({
    success: false,
    message,
  });
});

// ─── Socket.IO Setup ────
setupSocket(io);
setIO(io);

// ─── Server Startup ────
async function startServer(): Promise<void> {
  try {
    // 1. Run migrations
    await runMigrations();

    // 2. Connect to database
    await connectDatabase();

    // 3. Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info({ port: PORT }, "Server running");
      logger.info({ port: PORT }, "WebSocket ready");
    });
  } catch (error) {
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received");

  // 1. Stop accepting new connections
  httpServer.close(() => {
    logger.info("HTTP server closed");
  });

  // 2. Close all socket connections
  io.close(() => {
    logger.info("Socket.IO closed");
  });

  // 3. Disconnect database and close pool
  await disconnectDatabase();

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors (last resort)
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});

// ─── Start ─────
startServer();

export { app, io };