import { NextResponse } from "next/server";
import { AppError } from "./app-error";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Centralized error handler for API routes
 * Converts various error types into consistent API responses
 */
export function handleApiError(error: unknown): NextResponse {
  // Custom application errors
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: "Database validation error",
        code: "DATABASE_VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  // Generic Error objects
  if (error instanceof Error) {
    // Check for custom error properties (legacy error handling)
    const statusCode = (error as any).status || (error as any).statusCode || 500;
    
    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message;

    return NextResponse.json(
      {
        error: message,
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: statusCode }
    );
  }

  // Unknown error types
  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    },
    { status: 500 }
  );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case "P2002":
      // Unique constraint violation
      const target = (error.meta?.target as string[]) || [];
      return NextResponse.json(
        {
          error: `A record with this ${target.join(", ")} already exists`,
          code: "DUPLICATE_RECORD",
          details: { fields: target },
        },
        { status: 409 }
      );

    case "P2025":
      // Record not found
      return NextResponse.json(
        {
          error: "Record not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );

    case "P2003":
      // Foreign key constraint violation
      return NextResponse.json(
        {
          error: "Related record not found",
          code: "FOREIGN_KEY_CONSTRAINT",
        },
        { status: 400 }
      );

    case "P2014":
      // Required relation violation
      return NextResponse.json(
        {
          error: "Invalid relation in request",
          code: "INVALID_RELATION",
        },
        { status: 400 }
      );

    default:
      return NextResponse.json(
        {
          error: "Database operation failed",
          code: "DATABASE_ERROR",
          ...(process.env.NODE_ENV !== "production" && { details: error.message }),
        },
        { status: 500 }
      );
  }
}

/**
 * Async error wrapper for API route handlers
 * Usage: export const GET = asyncHandler(async (req) => { ... })
 */
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
