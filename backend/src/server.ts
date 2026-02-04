import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import { setupSocket } from "./socket/socket.js";

import { connectDatabase, disconnectDatabase } from "./configs/database.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "./types/type.js";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api", routes);
app.use("/chat", chatRoutes);

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes (baad me add karenge)
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "WhatsApp Clone API" });
});

// 404 Handler
app.use((req: Request, res: Response) => {
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

// Setup Socket.IO handlers
setupSocket(io);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    // Connect to database first
    await connectDatabase();

    // Then start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown handling
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

// Export for testing
export { app, io };
