/**
 * Structured logging system with context and log levels
 * Replaces scattered console.log statements
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && { context }),
    };

    if (this.isDevelopment) {
      // Pretty print in development
      return JSON.stringify(logEntry, null, 2);
    }

    // Single line JSON in production for log aggregators
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog("debug")) {
      console.log(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog("info")) {
      console.log(this.formatLog("info", message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatLog("warn", message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog("error")) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      };
      console.error(this.formatLog("error", message, errorContext));
    }
  }

  // Specific domain loggers
  api(message: string, context?: LogContext) {
    this.info(message, { ...context, domain: "API" });
  }

  database(message: string, context?: LogContext) {
    this.debug(message, { ...context, domain: "DATABASE" });
  }

  socket(message: string, context?: LogContext) {
    this.debug(message, { ...context, domain: "SOCKET" });
  }

  security(message: string, context?: LogContext) {
    this.warn(message, { ...context, domain: "SECURITY" });
  }

  performance(message: string, duration: number, context?: LogContext) {
    this.info(message, { ...context, duration, domain: "PERFORMANCE" });
  }
}

// Singleton instance
export const logger = new Logger();

// Performance measurement helper
export function measurePerformance<T>(
  fn: () => Promise<T>,
  operation: string
): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.performance(`Slow operation: ${operation}`, duration);
    } else {
      logger.debug(`Operation completed: ${operation}`, { duration });
    }
  });
}
