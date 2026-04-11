import pinoHttp from "pino-http";
import type { Express, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export function setupLogging(app: Express): void {
  // HTTP Request Logging
  app.use(
    pinoHttp.default({
      logger,
      autoLogging: {
        ignore: (req: Request): boolean => {
          return req.url === "/health" || req.url === "/favicon.ico";
        },
      },
      customProps: (_req: Request) => ({}),
      customLogLevel: (
        _req: Request,
        res: Response,
        error: Error | undefined,
      ) => {
        if (res.statusCode >= 500 || error) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (req: Request, _res: Response) => {
        return `${req.method} ${req.url} completed`;
      },
      customErrorMessage: (req: Request, _res: Response, _error: Error) => {
        return `${req.method} ${req.url} failed`;
      },
      serializers: {
        req: (req: Request) => ({
          method: req.method,
          url: req.url,
        }),
        res: (res: Response) => ({
          statusCode: res.statusCode,
        }),
      },
    }),
  );

  logger.info("Request logging configured");
}
