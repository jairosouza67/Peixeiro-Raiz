import pino from "pino";

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId: userId || "anonymous",
  });
}
