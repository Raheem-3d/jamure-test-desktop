import { z } from "zod";

/**
 * Centralized validation schemas for API requests
 * Using Zod for type-safe runtime validation
 */

// Common schemas
export const idSchema = z.string().cuid();
export const emailSchema = z.string().email();
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: emailSchema,
  password: z.string().min(8).max(100),
  role: z.enum(["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "EMPLOYEE", "ORG_MEMBER", "CLIENT"]),
  organizationId: idSchema.optional(),
  departmentId: idSchema.optional(),
});

export const updateUserSchema = createUserSchema.partial();

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).default("TODO"),
  deadline: z.string().datetime().optional(),
  assignees: z.array(idSchema).min(1, "At least one assignee required"),
  organizationId: idSchema.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  deadline: z.string().datetime().optional().nullable(),
  assignees: z.array(idSchema).optional(),
});

// Message schemas
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  receiverId: idSchema.optional(),
  channelId: idSchema.optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(100).optional(),
}).refine(
  (data) => data.receiverId || data.channelId,
  "Either receiverId or channelId must be provided"
);

// Channel schemas
export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  isDepartment: z.boolean().default(false),
  departmentId: idSchema.optional(),
  members: z.array(idSchema).optional(),
});

// Reminder schemas
export const createReminderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  remindAt: z.string().datetime(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  type: z.enum(["GENERAL", "TASK_DEADLINE", "MEETING", "FOLLOW_UP", "PERSONAL"]).default("GENERAL"),
  assigneeId: idSchema,
  taskId: idSchema.optional(),
});

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().max(100).optional(),
  employeesCount: z.number().int().positive().optional(),
  primaryEmail: emailSchema,
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  adminEmail: emailSchema,
  adminPassword: z.string().min(8).max(100),
});

// Query schemas
export const taskQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: idSchema.optional(),
  createdBy: idSchema.optional(),
  organizationId: idSchema.optional(),
  ...paginationSchema.shape,
});

export const userQuerySchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "EMPLOYEE", "ORG_MEMBER", "CLIENT"]).optional(),
  organizationId: idSchema.optional(),
  departmentId: idSchema.optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
});

// Validation helper functions
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}

export function validateParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): T {
  return schema.parse(params);
}
