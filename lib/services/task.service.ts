import { taskRepository, TaskFilters, PaginationOptions } from "@/lib/repositories/task.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { logger } from "@/lib/logger";
import { 
  ForbiddenError, 
  NotFoundError, 
  ValidationError 
} from "@/lib/errors/app-error";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { emitToUser } from "@/lib/socket-server";

/**
 * Task Service - Business logic for task operations
 * Centralizes task-related operations and integrates with other services
 */


/**

*/

export interface CreateTaskDTO {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: Date;
  assignees: string[];
  organizationId?: string;
  creatorId: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: Date | null;
  assignees?: string[];
}

export class TaskService {
  /**
   * Get task by ID with permission check
   */
  async getTask(taskId: string, userId: string, organizationId: string | null) {
    const task = await taskRepository.findById(taskId);

    // Permission check: user must be in same organization
    if (organizationId && task.organizationId !== organizationId) {
      throw new ForbiddenError("Cannot access tasks from another organization");
    }

    logger.api("Task retrieved", { taskId, userId });
    return task;
  }

  /**
   * Get tasks with filters and pagination
   */
  async getTasks(
    filters: TaskFilters,
    pagination?: PaginationOptions,
    isSuperAdmin: boolean = false
  ) {
    // Super admins can see all tasks, regular users are limited by organizationId
    if (!isSuperAdmin && !filters.organizationId) {
      throw new ForbiddenError("Organization ID required");
    }

    const result = await taskRepository.findMany(filters, pagination);
    
    logger.api("Tasks retrieved", {
      count: result.data.length,
      filters,
      pagination,
    });

    return result;
  }

  /**
   * Create a new task with assignments and notifications
   */
  async createTask(data: CreateTaskDTO) {
    const startTime = Date.now();

    try {
      // Validate assignees exist and belong to same organization
      if (data.assignees.length === 0) {
        throw new ValidationError("At least one assignee is required");
      }

      const assigneeUsers = await this.validateAssignees(
        data.assignees,
        data.organizationId
      );

      // Create task
      const task = await taskRepository.create({
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        status: data.status || "TODO",
        deadline: data.deadline,
        organization: data.organizationId ? { connect: { id: data.organizationId } } : undefined,
        creator: { connect: { id: data.creatorId } },
      });

      // Assign users (batch operation)
      await taskRepository.assignUsers(task.id, data.assignees);

      // Create task channel for collaboration
      await this.createTaskChannel(task, data.creatorId, assigneeUsers);

      // Send notifications to assignees (async)
      this.notifyAssignees(task, assigneeUsers, data.creatorId).catch((error) => {
        logger.error("Failed to send task assignment notifications", error, {
          taskId: task.id,
        });
      });

      // Create automatic deadline reminders if deadline is set
      if (data.deadline) {
        this.createDeadlineReminders(task.id, data.deadline, data.assignees).catch(
          (error) => {
            logger.error("Failed to create automatic reminders", error, {
              taskId: task.id,
            });
          }
        );
      }

      const duration = Date.now() - startTime;
      logger.performance("Task created", duration, {
        taskId: task.id,
        assigneeCount: data.assignees.length,
      });

      return task;
    } catch (error) {
      logger.error("Error creating task", error, { title: data.title });
      throw error;
    }
  }

  /**
   * Update task with validation and notifications
   */
  async updateTask(
    taskId: string,
    data: UpdateTaskDTO,
    userId: string,
    organizationId: string | null
  ) {
    // Get existing task and verify permissions
    const existingTask = await taskRepository.findById(taskId);

    if (organizationId && existingTask.organizationId !== organizationId) {
      throw new ForbiddenError("Cannot update tasks from another organization");
    }

    // Validate assignees if being updated
    if (data.assignees) {
      await this.validateAssignees(data.assignees, existingTask.organizationId);
      await taskRepository.assignUsers(taskId, data.assignees);
    }

    // Update task
    const updatedTask = await taskRepository.update(taskId, {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      deadline: data.deadline,
    });

    // Notify assignees of update
    if (data.status) {
      this.notifyTaskUpdate(updatedTask, userId).catch((error) => {
        logger.error("Failed to send task update notifications", error, { taskId });
      });
    }

    logger.api("Task updated", { taskId, userId });
    return updatedTask;
  }

  /**
   * Delete task with cascade
   */
  async deleteTask(
    taskId: string,
    userId: string,
    organizationId: string | null,
    role: string
  ) {
    const task = await taskRepository.findById(taskId);

    // Permission check
    if (organizationId && task.organizationId !== organizationId) {
      throw new ForbiddenError("Cannot delete tasks from another organization");
    }

    // Only ORG_ADMIN and SUPER_ADMIN can delete tasks
    if (!["ORG_ADMIN", "SUPER_ADMIN"].includes(role)) {
      throw new ForbiddenError("Insufficient permissions to delete task");
    }

    await taskRepository.delete(taskId);

    logger.api("Task deleted", { taskId, userId });
  }

  /**
   * Validate that assignees exist and belong to the organization
   */
  private async validateAssignees(
    assigneeIds: string[],
    organizationId: string | undefined
  ) {
    const users = await Promise.all(
      assigneeIds.map((id) => userRepository.findById(id))
    );

    // Verify all users belong to same organization
    if (organizationId) {
      const invalidUsers = users.filter((u) => u.organizationId !== organizationId);
      if (invalidUsers.length > 0) {
        throw new ValidationError(
          "All assignees must belong to the same organization",
          { invalidUserIds: invalidUsers.map((u) => u.id) }
        );
      }
    }

    return users;
  }

  /**
   * Create a channel for task collaboration
   */
  private async createTaskChannel(task: any, creatorId: string, assignees: any[]) {
    try {
      // Get admin users for organization
      const adminUsers = await db.user.findMany({
        where: {
          organizationId: task.organizationId,
          role: { in: ["ORG_ADMIN", "SUPER_ADMIN"] },
        },
        select: { id: true },
      });

      const channelMembers = [
        ...assignees.map((u: any) => ({ userId: u.id })),
        ...adminUsers.filter((u: any) => !assignees.find((a: any) => a.id === u.id))
          .map((u: any) => ({ userId: u.id })),
      ];

      await db.channel.create({
        data: {
          name: `Task: ${task.title}`,
          description: `Discussion for task: ${task.title}`,
          isPublic: false,
          isTaskThread: true,
          taskId: task.id,
          organizationId: task.organizationId,
          creatorId,
          members: {
            create: channelMembers,
          },
        },
      });

      logger.debug("Task channel created", { taskId: task.id });
    } catch (error) {
      logger.error("Failed to create task channel", error, { taskId: task.id });
      // Don't throw - channel creation is not critical
    }
  }

  /**
   * Send notifications to task assignees
   */
  private async notifyAssignees(task: any, assignees: any[], creatorId: string) {
    const creator = await userRepository.findById(creatorId);

    const notifications = await db.notification.createMany({
      data: assignees
        .filter((u) => u.id !== creatorId)
        .map((assignee) => ({
          type: "TASK_ASSIGNED",
          content: `You have been assigned to task: ${task.title}`,
          taskId: task.id,
          userId: assignee.id,
        })),
    });

    // Emit socket events
    assignees.forEach((assignee) => {
      if (assignee.id !== creatorId) {
        emitToUser(assignee.id, "new-notification", {
          type: "TASK_ASSIGNED",
          content: `You have been assigned to task: ${task.title}`,
          taskId: task.id,
        });
      }
    });

    logger.debug("Task assignment notifications sent", {
      taskId: task.id,
      count: notifications.count,
    });
  }

  /**
   * Notify users of task updates
   */
  private async notifyTaskUpdate(task: any, updaterId: string) {
    const assignees = await taskRepository.getAssignees(task.id);
    const updater = await userRepository.findById(updaterId);

    await db.notification.createMany({
      data: assignees
        .filter((u: any) => u.id !== updaterId)
        .map((assignee: any) => ({
          type: "TASK_UPDATED",
          content: `Task "${task.title}" was updated by ${updater.name || updater.email}`,
          taskId: task.id,
          userId: assignee.id,
        })),
    });

    logger.debug("Task update notifications sent", { taskId: task.id });
  }

  /**
   * Create automatic deadline reminders
   */
  private async createDeadlineReminders(
    taskId: string,
    deadline: Date,
    assigneeIds: string[]
  ) {
    const deadlineDate = new Date(deadline);
    const now = new Date();

    // Create reminders: 1 day before, 3 hours before, 1 hour before
    const reminderOffsets = [
      { hours: 24, type: "1 day before" },
      { hours: 3, type: "3 hours before" },
      { hours: 1, type: "1 hour before" },
    ];

    const reminders = reminderOffsets
      .map((offset) => {
        const remindAt = new Date(deadlineDate.getTime() - offset.hours * 60 * 60 * 1000);
        if (remindAt > now) {
          return assigneeIds.map((assigneeId) => ({
            title: `Task deadline reminder`,
            description: `Task deadline is approaching (${offset.type})`,
            remindAt,
            priority: "HIGH" as const,
            type: "TASK_DEADLINE" as const,
            isAutomatic: true,
            creatorId: assigneeId,
            assigneeId,
            taskId,
          }));
        }
        return [];
      })
      .flat();

    if (reminders.length > 0) {
      await db.reminder.createMany({ data: reminders });
      logger.debug("Automatic task reminders created", {
        taskId,
        count: reminders.length,
      });
    }
  }
}

// Singleton instance
export const taskService = new TaskService();
