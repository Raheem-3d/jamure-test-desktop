/**
 * Client Access Control Utilities
 * Helper functions to check and enforce client access permissions for tasks
 */

import { db } from "@/lib/db";

export type ClientAccessLevel = "VIEW" | "COMMENT" | "EDIT";

/**
 * Get client's access level for a specific task
 * @param userId - The user ID to check
 * @param taskId - The task ID to check access for
 * @returns ClientAccessLevel or null if no access
 */
export async function getClientAccessLevel(
  userId: string,
  taskId: string
): Promise<ClientAccessLevel | null> {
  try {
    // Check TaskClient table for existing relationship
    const taskClient = await db.taskClient.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
      select: {
        accessLevel: true,
      },
    });

    if (taskClient) {
      return taskClient.accessLevel as ClientAccessLevel;
    }

    // Check if user is task creator or assignee (they have full access)
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        creatorId: true,
        assignments: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (task?.creatorId === userId || (task?.assignments && task.assignments.length > 0)) {
      return "EDIT"; // Full access for creators and assignees
    }

    return null; // No access
  } catch (error) {
    console.error("Error getting client access level:", error);
    return null;
  }
}

/**
 * Check if user can view a task
 * @param userId - The user ID to check
 * @param taskId - The task ID to check
 * @returns boolean
 */
export async function canViewTask(userId: string, taskId: string): Promise<boolean> {
  const accessLevel = await getClientAccessLevel(userId, taskId);
  return accessLevel !== null; // Any access level allows viewing
}

/**
 * Check if user can comment on a task
 * @param userId - The user ID to check
 * @param taskId - The task ID to check
 * @returns boolean
 */
export async function canCommentOnTask(userId: string, taskId: string): Promise<boolean> {
  const accessLevel = await getClientAccessLevel(userId, taskId);
  return accessLevel === "COMMENT" || accessLevel === "EDIT";
}

/**
 * Check if user can edit a task
 * @param userId - The user ID to check
 * @param taskId - The task ID to check
 * @returns boolean
 */
export async function canEditTask(userId: string, taskId: string): Promise<boolean> {
  const accessLevel = await getClientAccessLevel(userId, taskId);
  return accessLevel === "EDIT";
}

/**
 * Get all tasks accessible to a client user
 * @param userId - The client user ID
 * @returns Array of tasks with access levels
 */
export async function getClientAccessibleTasks(userId: string) {
  try {
    const taskClients = await db.taskClient.findMany({
      where: { userId },
      include: {
        task: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
            _count: {
              select: {
                comments: true,
              },
            },
          },
        },
      },
    });

    return taskClients.map((tc: any) => ({
      ...tc.task,
      clientAccessLevel: tc.accessLevel,
    }));
  } catch (error) {
    console.error("Error getting client accessible tasks:", error);
    return [];
  }
}

/**
 * Middleware to check task access
 * Throws error if user doesn't have required access level
 */
export async function enforceTaskAccess(
  userId: string,
  taskId: string,
  requiredLevel: ClientAccessLevel
) {
  const userAccessLevel = await getClientAccessLevel(userId, taskId);

  if (!userAccessLevel) {
    throw new Error("Access denied: You don't have access to this task");
  }

  const accessHierarchy = {
    VIEW: 1,
    COMMENT: 2,
    EDIT: 3,
  };

  if (accessHierarchy[userAccessLevel] < accessHierarchy[requiredLevel]) {
    throw new Error(
      `Access denied: You need ${requiredLevel} access but only have ${userAccessLevel} access`
    );
  }

  return true;
}

/**
 * Get access level display info
 */
export function getAccessLevelInfo(level: ClientAccessLevel) {
  const info = {
    VIEW: {
      label: "View Only",
      description: "Can view task details",
      color: "bg-gray-100 text-gray-800",
      permissions: ["View task details", "View comments"],
    },
    COMMENT: {
      label: "Can Comment",
      description: "Can view and add comments",
      color: "bg-blue-100 text-blue-800",
      permissions: ["View task details", "View comments", "Add comments"],
    },
    EDIT: {
      label: "Can Edit",
      description: "Full access to edit task",
      color: "bg-green-100 text-green-800",
      permissions: [
        "View task details",
        "View comments",
        "Add comments",
        "Edit task details",
        "Update task status",
        "Change priority",
      ],
    },
  };

  return info[level];
}
