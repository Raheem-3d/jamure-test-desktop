/**
 * Example of refactored API route using new architecture
 * This demonstrates how to use:
 * - Service layer
 * - Repository pattern  
 * - Error handling
 * - Validation
 * - Rate limiting
 * - Logging
 */

import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { getSessionUserWithPermissions } from "@/lib/org";
import { asyncHandler } from "@/lib/errors/error-handler";
import { validateBody, validateQuery, createTaskSchema, taskQuerySchema } from "@/lib/validation/schemas";
import { withRateLimit, RateLimitConfig } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET /api/tasks - Get tasks with filters
 */
export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getSessionUserWithPermissions(request as any);
  const searchParams = request.nextUrl.searchParams;
  
  // Validate query parameters
  const query = validateQuery(searchParams, taskQuerySchema);

  logger.api("Fetching tasks", {
    userId: user.id,
    organizationId: user.organizationId,
    filters: query,
  });

  // Use service layer
  const result = await taskService.getTasks(
    {
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
      createdBy: query.createdBy,
      organizationId: user.isSuperAdmin ? query.organizationId : user.organizationId,
    },
    {
      page: query.page,
      limit: query.limit,
    },
    user.isSuperAdmin
  );

  return NextResponse.json(result);
});

/**
 * POST /api/tasks - Create a new task
 * Rate limited to prevent abuse
 */
export const POST = withRateLimit(
  asyncHandler(async (request: NextRequest) => {
    const user = await getSessionUserWithPermissions(request as any);

    // Validate request body
    const body = await validateBody(request, createTaskSchema);

    logger.api("Creating task", {
      userId: user.id,
      organizationId: user.organizationId,
      title: body.title,
    });

    // Use service layer which handles all business logic
    const task = await taskService.createTask({
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      organizationId: user.organizationId || undefined,
      creatorId: user.id,
    });

    return NextResponse.json(task, { status: 201 });
  }),
  RateLimitConfig.general
);
