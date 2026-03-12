import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import { logger } from "../utils/logger.js";

export function setupSecurity(app: Express): void {
  const CLIENT_URL = process.env.CLIENT_URL!;

  // Helmet (Security Headers)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // HSTS - force HTTPS
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // Prevent clickjacking
      frameguard: { action: "deny" },
      // Prevent MIME type sniffing
      noSniff: true,
      // XSS protection
      xssFilter: true,
    })
  );

  // CORS 
  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    })
  );

  // Rate Limiting

  // General API rate limit
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
    handler: (req, res, next, options) => {
      logger.warn(
        { ip: req.ip, path: req.path },
        "Rate limit exceeded"
      );
      res.status(429).json(options.message);
    },
  });

  // Stricter limit for auth routes (login, register)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many authentication attempts, please try again later",
    },
    handler: (req, res, next, options) => {
      logger.warn(
        { ip: req.ip, path: req.path },
        "Auth rate limit exceeded"
      );
      res.status(429).json(options.message);
    },
  });

  // File upload rate limit
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many uploads, please try again later",
    },
  });

  // Apply rate limiters
  app.use("/api", apiLimiter);
  app.use("/api/login", authLimiter);
  app.use("/api/register", authLimiter);
  app.use("/api/signup", authLimiter);
  app.use("/api/message", uploadLimiter);

  logger.info("Security middleware configured");
}