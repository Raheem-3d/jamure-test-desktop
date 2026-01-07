# 🚀 Quick Reference: New Architecture Patterns

## 📌 Cheat Sheet

### Creating a New API Route

```typescript
import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/errors/error-handler";
import { validateBody, yourSchema } from "@/lib/validation/schemas";
import { yourService } from "@/lib/services/your.service";
import { getSessionUserWithPermissions } from "@/lib/org";
import { withRateLimit, RateLimitConfig } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await getSessionUserWithPermissions();
  
  logger.api("Fetching resources", { userId: user.id });
  
  const data = await yourService.getData(user.id);
  
  return NextResponse.json(data);
});

export const POST = withRateLimit(
  asyncHandler(async (request: NextRequest) => {
    const user = await getSessionUserWithPermissions();
    const body = await validateBody(request, yourSchema);
    
    logger.api("Creating resource", { userId: user.id });
    
    const result = await yourService.create(body, user.id);
    
    return NextResponse.json(result, { status: 201 });
  }),
  RateLimitConfig.general
);
```

---

### Throwing Errors

```typescript
import { 
  NotFoundError, 
  ForbiddenError, 
  ValidationError,
  ConflictError 
} from "@/lib/errors/app-error";

// 404
throw new NotFoundError("User", userId);

// 403
throw new ForbiddenError("Admin access required");

// 400
throw new ValidationError("Invalid email format", { field: "email" });

// 409
throw new ConflictError("Email already exists");
```

---

### Logging

```typescript
import { logger } from "@/lib/logger";

// Info
logger.info("User logged in", { userId, email });

// Error
logger.error("Database query failed", error, { query: "findUser" });

// Domain-specific
logger.api("Request received", { path, method });
logger.database("Query executed", { table: "users", duration: 25 });
logger.socket("User connected", { socketId, userId });
logger.security("Failed login attempt", { email, ip });
logger.performance("Slow query", 1500, { query: "complexJoin" });
```

---

### Validation

```typescript
import { validateBody, validateQuery } from "@/lib/validation/schemas";
import { z } from "zod";

// Define schema
const mySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

// Validate body
const data = await validateBody(request, mySchema);

// Validate query params
const query = validateQuery(request.nextUrl.searchParams, querySchema);
```

---

### Repository Usage

```typescript
import { taskRepository } from "@/lib/repositories/task.repository";
import { userRepository } from "@/lib/repositories/user.repository";

// Find with filters
const tasks = await taskRepository.findMany(
  { status: "TODO", organizationId: "org_123" },
  { page: 1, limit: 20 }
);

// Find by ID
const task = await taskRepository.findById(taskId);

// Create
const task = await taskRepository.create({
  title: "New Task",
  creator: { connect: { id: userId } },
});

// Update
const updated = await taskRepository.update(taskId, { status: "DONE" });

// Delete
await taskRepository.delete(taskId);

// Custom queries
const assignees = await taskRepository.getAssignees(taskId);
```

---

### Service Layer

```typescript
import { taskService } from "@/lib/services/task.service";

// Get task (with permission check)
const task = await taskService.getTask(taskId, userId, organizationId);

// Get tasks (with filters)
const result = await taskService.getTasks(
  { status: "TODO", organizationId },
  { page: 1, limit: 20 },
  isSuperAdmin
);

// Create task (handles everything)
const task = await taskService.createTask({
  title: "New Task",
  assignees: ["user1", "user2"],
  organizationId,
  creatorId: userId,
});

// Update task
const updated = await taskService.updateTask(
  taskId,
  { status: "DONE" },
  userId,
  organizationId
);
```

---

### Rate Limiting

```typescript
import { withRateLimit, RateLimitConfig } from "@/lib/middleware/rate-limit";

// Use preset config
export const POST = withRateLimit(handler, RateLimitConfig.auth);

// Custom config
export const POST = withRateLimit(handler, {
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
});

// Available presets:
// - RateLimitConfig.general (100/min)
// - RateLimitConfig.auth (5/15min)
// - RateLimitConfig.upload (10/min)
// - RateLimitConfig.message (50/min)
// - RateLimitConfig.strict (10/min)
```

---

## 🔄 Migration Patterns

### Replace Console Logs

```typescript
// BEFORE
console.log("User created:", user.id);
console.error("Error:", error);

// AFTER
logger.info("User created", { userId: user.id });
logger.error("User creation failed", error, { email: user.email });
```

---

### Replace Try-Catch

```typescript
// BEFORE
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await someOperation(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// AFTER
export const POST = asyncHandler(async (request: Request) => {
  const data = await validateBody(request, schema);
  const result = await someOperation(data);
  return NextResponse.json(result);
});
```

---

### Replace Direct DB Calls

```typescript
// BEFORE
const tasks = await db.task.findMany({
  where: { organizationId },
  include: { creator: true, assignments: true },
});

// AFTER
const tasks = await taskRepository.findMany({ organizationId });
```

---

### Replace N+1 Queries

```typescript
// BEFORE (N+1 problem)
for (const userId of userIds) {
  await db.notification.create({
    data: { userId, content: "Hello" }
  });
}

// AFTER (batch operation)
await db.notification.createMany({
  data: userIds.map(userId => ({ userId, content: "Hello" })),
});
```

---

## 📊 Performance Tips

1. **Use Indexes**: Query by indexed fields
2. **Batch Operations**: Use `createMany`, `updateMany`, `deleteMany`
3. **Select Specific Fields**: Don't fetch entire models
4. **Pagination**: Always paginate large datasets
5. **Parallel Queries**: Use `Promise.all()` for independent queries

```typescript
// Good: Parallel independent queries
const [users, tasks, channels] = await Promise.all([
  userRepository.findMany({ organizationId }),
  taskRepository.findMany({ organizationId }),
  db.channel.findMany({ where: { organizationId } }),
]);

// Bad: Sequential queries (slower)
const users = await userRepository.findMany({ organizationId });
const tasks = await taskRepository.findMany({ organizationId });
const channels = await db.channel.findMany({ where: { organizationId } });
```

---

## 🧪 Testing Patterns

```typescript
import { taskService } from "@/lib/services/task.service";
import { taskRepository } from "@/lib/repositories/task.repository";

// Mock repository
jest.mock("@/lib/repositories/task.repository");

describe("TaskService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create task", async () => {
    const mockTask = { id: "task_1", title: "Test" };
    (taskRepository.create as jest.Mock).mockResolvedValue(mockTask);

    const result = await taskService.createTask({
      title: "Test",
      assignees: ["user_1"],
      creatorId: "creator_1",
    });

    expect(result).toEqual(mockTask);
    expect(taskRepository.create).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🔒 Security Checklist

- [ ] Use `asyncHandler` for all routes
- [ ] Validate all inputs with Zod schemas
- [ ] Check permissions (organizationId, role)
- [ ] Apply rate limiting to all routes
- [ ] Never expose raw error details in production
- [ ] Use parameterized queries (Prisma does this)
- [ ] Hash passwords before storage
- [ ] Sanitize user input
- [ ] Use HTTPS in production
- [ ] Set security headers (already in middleware)

---

## 📦 File Structure

```
lib/
├── errors/
│   ├── app-error.ts          # Custom error classes
│   └── error-handler.ts      # Error handler & asyncHandler
├── validation/
│   └── schemas.ts            # Zod validation schemas
├── repositories/
│   ├── task.repository.ts    # Task data access
│   └── user.repository.ts    # User data access
├── services/
│   └── task.service.ts       # Task business logic
├── middleware/
│   └── rate-limit.ts         # Rate limiting
└── logger.ts                 # Structured logging

app/api/
├── health/
│   └── route.ts              # Health check
└── tasks-refactored/
    └── route.ts              # Example refactored route
```

---

## 🎯 Common Tasks

### Add a New Entity

1. Create repository: `lib/repositories/entity.repository.ts`
2. Create service: `lib/services/entity.service.ts`
3. Create validation schema: Add to `lib/validation/schemas.ts`
4. Create API route: `app/api/entity/route.ts`
5. Use new pattern with asyncHandler, validation, service

### Add Validation to Existing Route

1. Define Zod schema in `lib/validation/schemas.ts`
2. Import `validateBody` or `validateQuery`
3. Replace manual validation with schema validation

### Add Rate Limiting to Route

1. Import `withRateLimit` and `RateLimitConfig`
2. Wrap route handler: `withRateLimit(handler, config)`

### Add Logging to Function

1. Import `logger`
2. Add contextual logs: `logger.info("Operation", { key: value })`
3. Log errors: `logger.error("Failed", error, context)`

---

## 💡 Pro Tips

1. **Start Small**: Refactor one route at a time
2. **Test Incrementally**: Test each refactored route
3. **Keep Old Code**: Don't delete until new version works
4. **Use Types**: Let TypeScript catch errors
5. **Log Everything Important**: Helps with debugging
6. **Batch Database Ops**: Always use `createMany` when possible
7. **Cache Wisely**: Consider Redis for frequently accessed data
8. **Monitor Performance**: Use logger.performance() liberally

---

## 📞 Quick Commands

```bash
# Apply database indexes
npx prisma migrate dev --name add_performance_indexes

# Check TypeScript errors
npx tsc --noEmit

# Test health endpoint
curl http://localhost:3000/api/health

# View logs (production)
# Add LOG_LEVEL=debug to .env for verbose logs

# Generate Prisma client (after schema changes)
npx prisma generate
```

---

**Keep this file handy for quick reference!** 📌
