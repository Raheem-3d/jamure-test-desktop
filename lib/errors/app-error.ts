/**
 * Custom Error Classes for Application-wide Error Handling
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, "CONFLICT", details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests, please try again later") {
    super(429, message, "RATE_LIMIT_EXCEEDED");
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error", details?: any) {
    super(500, message, "INTERNAL_SERVER_ERROR", details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, "DATABASE_ERROR", details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(502, `${service} service error: ${message}`, "EXTERNAL_SERVICE_ERROR");
  }
}
