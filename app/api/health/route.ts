import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: "connected",
      },
      performance: {
        responseTime: `${duration}ms`,
      },
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
