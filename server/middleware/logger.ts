import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createRequestLogger } from "../lib/logger";

// Extend Express Request to include logger and requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      log?: ReturnType<typeof createRequestLogger>;
    }
  }
}

/**
 * Middleware to add requestId and structured logger to each request
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Attach requestId and logger to request
  req.requestId = requestId;
  req.log = createRequestLogger(requestId, req.user?.id);

  // Log incoming request
  req.log.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  }, "Incoming request");

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    req.log?.[res.statusCode >= 400 ? "error" : "info"]({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    }, "Request completed");
  });

  next();
}
