import { db } from "@/lib/db";
import { Prisma, Task, TaskPriority, TaskStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { DatabaseError, NotFoundError } from "@/lib/errors/app-error";

/**
 * Task Repository - Centralized data access for tasks
 * Abstracts Prisma queries and provides reusable methods
 */

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  createdBy?: string;
  organizationId?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class TaskRepository {
  private readonly defaultInclude = {
    creator: {
      select: { id: true, name: true, email: true, image: true },
    },
    assignments: {
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    },
    comments: {
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" as const },
      take: 5,
    },
    _count: {
      select: { comments: true, assignments: true },
    },
  };

  async findById(taskId: string, includeDetails = true) {
    try {
      logger.database("Finding task by ID", { taskId });
      
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: includeDetails ? this.defaultInclude : undefined,
      });

      if (!task) {
        throw new NotFoundError("Task", taskId);
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error("Error finding task by ID", error, { taskId });
      throw new DatabaseError("Failed to fetch task");
    }
  }

  async findMany(filters: TaskFilters, pagination?: PaginationOptions) {
    try {
      logger.database("Finding tasks with filters", { filters, pagination });

      const where = this.buildWhereClause(filters);
      const skip = pagination ? (pagination.page - 1) * pagination.limit : undefined;
      const take = pagination?.limit;

      const [tasks, total] = await Promise.all([
        db.task.findMany({
          where,
          include: this.defaultInclude,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        db.task.count({ where }),
      ]);

      return {
        data: tasks,
        pagination: pagination
          ? {
              page: pagination.page,
              limit: pagination.limit,
              total,
              totalPages: Math.ceil(total / pagination.limit),
            }
          : undefined,
      };
    } catch (error) {
      logger.error("Error finding tasks", error, { filters });
      throw new DatabaseError("Failed to fetch tasks");
    }
  }

  async create(data: Prisma.TaskCreateInput) {
    try {
      logger.database("Creating task", { title: data.title });

      const task = await db.task.create({
        data,
        include: this.defaultInclude,
      });

      logger.info("Task created successfully", { taskId: task.id });
      return task;
    } catch (error) {
      logger.error("Error creating task", error, { title: data.title });
      throw new DatabaseError("Failed to create task");
    }
  }

  async update(taskId: string, data: Prisma.TaskUpdateInput) {
    try {
      logger.database("Updating task", { taskId });

      const task = await db.task.update({
        where: { id: taskId },
        data,
        include: this.defaultInclude,
      });

      logger.info("Task updated successfully", { taskId });
      return task;
    } catch (error) {
      logger.error("Error updating task", error, { taskId });
      throw new DatabaseError("Failed to update task");
    }
  }

  async delete(taskId: string) {
    try {
      logger.database("Deleting task", { taskId });

      await db.task.delete({
        where: { id: taskId },
      });

      logger.info("Task deleted successfully", { taskId });
    } catch (error) {
      logger.error("Error deleting task", error, { taskId });
      throw new DatabaseError("Failed to delete task");
    }
  }

  async assignUsers(taskId: string, userIds: string[]) {
    try {
      logger.database("Assigning users to task", { taskId, userIds });

      // Remove existing assignments and add new ones in a transaction
      await db.$transaction([
        db.taskAssignment.deleteMany({ where: { taskId } }),
        db.taskAssignment.createMany({
          data: userIds.map((userId) => ({ taskId, userId })),
          skipDuplicates: true,
        }),
      ]);

      logger.info("Users assigned to task successfully", { taskId, count: userIds.length });
    } catch (error) {
      logger.error("Error assigning users to task", error, { taskId });
      throw new DatabaseError("Failed to assign users to task");
    }
  }

  async getAssignees(taskId: string) {
    try {
      const assignments = await db.taskAssignment.findMany({
        where: { taskId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      return assignments.map((a: any) => a.user);
    } catch (error) {
      logger.error("Error fetching task assignees", error, { taskId });
      throw new DatabaseError("Failed to fetch assignees");
    }
  }

  private buildWhereClause(filters: TaskFilters): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.createdBy) {
      where.creatorId = filters.createdBy;
    }

    if (filters.assigneeId) {
      where.assignments = {
        some: { userId: filters.assigneeId },
      };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return where;
  }
}

// Singleton instance
export const taskRepository = new TaskRepository();
