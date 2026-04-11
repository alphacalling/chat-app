import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import { logger } from "../utils/logger.js";

//* auth limiter 
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
  handler: (req, res, _next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, "Auth rate limit exceeded");
    res.status(429).json(options.message);
  },
});

//* message limiter 
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many messages, please slow down",
  },
});

//* upload limiter 
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many uploads, please try again later",
  },
});

//* totp limiter 
export const totpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many TOTP attempts, please try again later",
  },
  handler: (req, res, _next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, "TOTP rate limit exceeded");
    res.status(429).json(options.message);
  },
});

//* status limiter 
export const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many status updates, please try again later",
  },
});

export function setupSecurity(app: Express): void {
  const CLIENT_URL = process.env.CLIENT_URL!;

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: "deny" },
      noSniff: true,
      xssFilter: true,
    }),
  );

  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    }),
  );

  logger.info("Security middleware configured");
}
