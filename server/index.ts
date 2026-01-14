import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logger } from "./lib/logger";
import { requestLogger } from "./middleware/logger";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CORS Configuration - read from environment variable for flexibility
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  
  // Default fallback for development
  return [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ];
}

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, "CORS request from unauthorized origin");
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Request logging middleware (must be after body parsers, before routes)
app.use(requestLogger);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Use structured logger instead of console.log
      logger.debug({
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
      }, "API request completed");
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
  
    // Use structured logger if available, otherwise fallback to console
    const logMethod = status >= 500 ? "error" : "warn";
    const logMessage = {
      error: err.message,
      stack: err.stack,
      status,
      method: req.method,
      path: req.path,
    };
  
    if (req.log) {
      req.log[logMethod](logMessage, "Request error");
    } else {
      logger[logMethod](logMessage, "Request error (no req.log)");
    }
  
    const message =
      status >= 500 ? "Internal Server Error" : err.message || "Error";
  
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: any = {
    port,
  };

  // On Windows, `reusePort` is not supported and causes ENOTSUP.
  // Only enable it on non-Windows platforms.
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    logger.info({ port, env: process.env.NODE_ENV }, "Server started");
  });
})();
