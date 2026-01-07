import { NextRequest, NextResponse } from "next/server";
import { RateLimitError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based solution like @upstash/ratelimit
 */

interface RateLimitStore {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitStore>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   * @param identifier - Unique identifier (IP, userId, etc.)
   * @param limit - Max requests allowed in window
   * @param windowMs - Time window in milliseconds
   */
  async check(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const key = `${identifier}:${limit}:${windowMs}`;
    
    let entry = this.store.get(key);

    // Reset if window expired
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      this.store.set(key, entry);
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: entry.resetAt,
      };
    }

    // Check limit
    if (entry.count >= limit) {
      logger.security("Rate limit exceeded", {
        identifier,
        count: entry.count,
        limit,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment counter
    entry.count += 1;
    
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoints
 */
export const RateLimitConfig = {
  // General API endpoints
  general: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Authentication endpoints
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // File upload endpoints
  upload: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Message sending
  message: {
    limit: 50,
    windowMs: 60 * 1000, // 1 minute
  },
  // Strict limit for sensitive operations
  strict: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: NextRequest,
  config: { limit: number; windowMs: number } = RateLimitConfig.general
): Promise<void> {
  // Get identifier (IP address or user ID if authenticated)
  const identifier = getIdentifier(request);

  const result = await rateLimiter.check(
    identifier,
    config.limit,
    config.windowMs
  );

  if (!result.allowed) {
    const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new RateLimitError(
      `Too many requests. Try again in ${resetIn} seconds.`
    );
  }

  // Add rate limit headers (optional but helpful for clients)
  // These would need to be added to the response in the route handler
}

/**
 * Get unique identifier for rate limiting
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from session/auth
  // For now, use IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip") || "unknown";

  return ip;
}

/**
 * Higher-order function to wrap API route with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  config?: { limit: number; windowMs: number }
) {
  return async (req: NextRequest, context?: any) => {
    try {
      await rateLimit(req, config);
      return await handler(req, context);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { 
            status: 429,
            headers: {
              "Retry-After": "60",
            },
          }
        );
      }
      throw error;
    }
  };
}

export { rateLimiter };
