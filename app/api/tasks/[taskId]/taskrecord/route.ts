

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitToUser, getSocketIO } from "@/lib/socket-server";
import { Task, AutomationRule, User, Tag, TaskStatus, Stage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// ========== Type Definitions ==========
type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "changed"
  | "before"
  | "after";

interface Condition {
  field: string;
  operator: Operator;
  value: any;
}

interface Action {
  type:
    | "move_stage"
    | "assign_user"
    | "set_due_date"
    | "add_tag"
    | "remove_tag"
    | "send_notification"
    | "change_status"
    | "set_priority"
    | "create_subtask"
    | "archive_task"
    | "log_message"
    | "set_custom_field";
  value: any;
  metadata?: Record<string, any>;
}

type TriggerType =
  | "status_change"
  | "stage_change"
  | "priority_change"
  | "due_date_approaching"
  | "due_date_passed"
  | "task_created"
  | "task_assigned"
  | "tag_added"
  | "comment_added"
  | "file_uploaded"
  | "specific_task"
  | "time_based"
  | "completion_percentage";

interface TaskWithRelations extends Task {
  tags?: Tag[];
  assignee?: User | null;
  stage?: Stage | null;
  previousValues?: Partial<Task>;
}

interface AutomationContext {
  previousTask: Partial<TaskWithRelations>;
  currentTask: Partial<TaskWithRelations>;
  changes: Record<string, any>;
  userId: string;
}

interface Notification {
  type: string;
  userId: string;
  content: string;
  metadata?: Record<string, any>;
}

// ========== Helper Functions ==========
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: any) =>
    console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) =>
    process.env.NODE_ENV === "development" &&
    console.debug(`[DEBUG] ${message}`, data),
};


export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = params.taskId;
  const {
    title,
    description,
    dueDate,
    startDate,
    endDate,
    stageId,
    priority,
    isComplete,
    assigneeId,
    status,
    tags = [],
  } = await request.json();

  // 2️⃣ Normalize tags to string names
  const normalizedTagNames = tags.map((tag: any) =>
    typeof tag === "string" ? tag : tag.name
  );

  // 3️⃣ Fetch existing tags
  const existingTags = await db.tag.findMany({
    where: { name: { in: normalizedTagNames } },
  });
  const existingTagNames = new Set(existingTags.map((t: any) => t.name as string));

  // 4️⃣ Create any missing tags
  const newTagNames = normalizedTagNames.filter(
    (name: string) => !existingTagNames.has(name)
  );
  if (newTagNames.length > 0) {
    await db.tag.createMany({
      data: newTagNames.map((name: string) => ({ name })),
      skipDuplicates: true,
    });
  }

  // 5️⃣ Fetch all tags again (so we have IDs for connect)
  const allTags = await db.tag.findMany({
    where: { name: { in: normalizedTagNames } },
  });

  const assigneeIds = Array.isArray(assigneeId) ? assigneeId : [assigneeId];

 

  const newTask = await db.record.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
  createdBy: sessionUserId,
      parentTaskId: taskId,
      priority,
      isComplete,
      status,
      stageId,
      tags: {
  connect: allTags.map((tag: any) => ({ id: tag.id as string })),
      },
      assignees: {
        connectOrCreate: assigneeIds.map((id) => ({
          where: { taskId_userId: { taskId, userId: id } },
          create: { taskId, userId: id },
        })),
      },
    },
    include: {
      tags: true,
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },

    
  });

  console.log(newTask, "newTaskkkkkkkkkkk");

  // 7️⃣ Log activity
  await db.taskActivity.create({
    data: {
      taskId: taskId,
      userId: sessionUserId,
      type: "task_created",
      description: `Task "${newTask.title}" was created.`,
    },
  });

  // 8️⃣ Run automation
  await checkAutomationRules({
    previousTask: {},
    currentTask: newTask,
    changes: {},
    userId: sessionUserId,
  });

  return NextResponse.json({ task: newTask }, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;

  try {
    const records = await db.record.findMany({
      where: {
        parentTaskId: taskId,
      },
      include: {
        tags: true,
        assignees: true,
        createdByUser: true,
      },
    });

    return NextResponse.json({ records }, { status: 200 });
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}





export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params; // Await params first
  const body = await request.json();

  console.log('Route taskId:', taskId);
  console.log('Body id (recordId):', body.id);
  console.log('Body assignees:', body.assignees);

  // Get current task with relationships
  const currentTask = await db.record.findUnique({
    where: { id: body.id },
    include: {
      stage: true,
      tags: true,
      assignees: true,
    },
  });

  if (!currentTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  console.log('Current task assignees:', currentTask.assignees);

  // Extract assignee user IDs from the request body (now from assignees array)
  const assigneeUserIds = Array.isArray(body.assignees)
    ? body.assignees.map((a: any) => a?.userId || a).filter(Boolean)
    : [];

  console.log('Assignee user IDs from request:', assigneeUserIds);

  // Prepare update data
  const updateData: any = {
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: body.status,
    parentTaskId: body.parentTaskId,
    stageId: body.stageId,
    isComplete: body.isComplete,
    updatedAt: new Date(),
  };

  // Only update dates if provided, otherwise leave unchanged
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.startDate !== undefined) {
    updateData.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  }

  // Handle assignees - Use TaskAssignment model
  if (body.assignees !== undefined) {
    try {
      // Delete all existing task assignments for this record
      await db.taskAssignment.deleteMany({
        where: { recordId: body.id }
      });

      // Create new task assignments
      if (assigneeUserIds.length > 0) {
        const newAssignments = await db.taskAssignment.createMany({
          data: assigneeUserIds.map((userId: string) => ({
            userId: userId,
            recordId: body.id,
            taskId: taskId,
          })),
          skipDuplicates: true,
        });
        console.log('Created task assignments:', newAssignments);
      }
    } catch (assigneeError: any) {
      console.error('Error handling task assignments:', assigneeError);
      return NextResponse.json({ 
        error: "Failed to update assignees",
        details: assigneeError?.message 
      }, { status: 500 });
    }
  }

  // Handle tags if provided (support strings, {id}, {name}; fix names passed as ids)
  if (Array.isArray(body.tags)) {
    // Normalize incoming shapes
    const raw = body.tags as any[];
    const providedIds: string[] = raw
      .map((t) => (typeof t === "string" ? undefined : t?.id))
      .filter((v): v is string => Boolean(v));
    const providedNames: string[] = raw
      .map((t) => (typeof t === "string" ? (t as string) : t?.name))
      .filter((v): v is string => Boolean(v));

    // Some UIs send names inside id; detect ids that don't exist and treat them as names
    const uniqueProvidedIds = Array.from(new Set(providedIds));
    const foundById = uniqueProvidedIds.length
      ? await db.tag.findMany({ where: { id: { in: uniqueProvidedIds } } })
      : [];
    const foundIdSet = new Set(foundById.map((t: any) => t.id as string));
    const idsThatDontExistAsId = uniqueProvidedIds.filter((id) => !foundIdSet.has(id));
    const allNames = Array.from(new Set([...providedNames, ...idsThatDontExistAsId]));

    // Ensure all names exist by creating missing ones
    if (allNames.length > 0) {
      const existingByName = await db.tag.findMany({ where: { name: { in: allNames } } });
      const existingNameSet = new Set(existingByName.map((t: any) => (t.name as string).toLowerCase()));
      const namesToCreate = allNames.filter((n) => !existingNameSet.has(n.toLowerCase()));
      if (namesToCreate.length > 0) {
        await db.tag.createMany({ data: namesToCreate.map((name) => ({ name })), skipDuplicates: true });
      }
    }

    // Collect final IDs: valid ids + ids from names
    const byNames = allNames.length
      ? await db.tag.findMany({ where: { name: { in: allNames } } })
      : [];
    const finalIds = new Set<string>();
    foundById.forEach((t: any) => finalIds.add(t.id as string));
    byNames.forEach((t: any) => finalIds.add(t.id as string));

    updateData.tags = {
      set: Array.from(finalIds).map((id) => ({ id })),
    };
  }

  console.log('Update data (without assignees):', JSON.stringify(updateData, null, 2));

  const isStageTransition =
    body.stageId && body.stageId !== currentTask.stageId;
  const newStage = isStageTransition
    ? await db.stage.findUnique({ where: { id: body.stageId } })
    : null;

  if (isStageTransition && newStage) {
    updateData.isComplete = body.isComplete ?? newStage.isCompleted;

    if (newStage.isCompleted && !currentTask.completedAt) {
      updateData.completedAt = new Date();
    } else if (currentTask.stage?.isCompleted && !newStage.isCompleted) {
      updateData.completedAt = null;
    }

    // Ensure status is 'in_progress' when task is marked incomplete
    if (updateData.isComplete === false) {
      updateData.status = "in_progress";
    }
  }

  try {
    // Update the task (without assignees in updateData)
    const updatedTask = await db.record.update({
      where: { id: body.id },
      data: updateData,
      include: {
        stage: true,
        tags: true,
        assignees: true, // This will now include the newly created assignees
      },
    });

    console.log('Updated task assignees:', updatedTask.assignees);

    // Create activity log
    await db.taskActivity.create({
      data: {
        taskId,
        userId: sessionUserId,
        type: isStageTransition ? "stage_changed" : "task_updated",
        description: isStageTransition
          ? `Task moved from ${currentTask.stage?.name} to ${newStage?.name}`
          : "Task details updated",
      },
    });

    // Check automation rules
    await checkAutomationRules({
      previousTask: currentTask,
      currentTask: updatedTask,
      changes: body,
      userId: sessionUserId,
    });

    // ✅ Emit real-time update via socket.io
    const socketIO = getSocketIO();
    if (socketIO) {
      // Emit to all users in the project/task room
      socketIO.emit("task:updated", {
        taskId: updatedTask.id,
        parentTaskId: taskId,
        task: updatedTask,
    updatedBy: sessionUserId,
        timestamp: new Date().toISOString(),
      });
      console.log('✅ Socket event emitted: task:updated', updatedTask.id);
    }

    return NextResponse.json({ task: updatedTask }, { status: 200 });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ 
      error: "Failed to update task",
      details: (error as any)?.message 
    }, { status: 500 });
  }
}




function doesTriggerMatch(
  trigger: TriggerType,
  prev: any,
  curr: any,
  changes: Record<string, any>
): boolean {
  switch (trigger) {
    case "status_change":
      return prev.status !== curr.status;
    case "stage_change":
      return prev.stageId !== curr.stageId;
    case "priority_change":
      return prev.priority !== curr.priority;
    case "task_assigned":
      return prev.assigneeId !== curr.assigneeId;
    case "due_date_approaching":
      return isDueDateApproaching(curr.dueDate);
    case "due_date_passed":
      return isDueDatePassed(curr.dueDate);
    case "task_created":
      return changes.isNew === true;
    case "tag_added":
      return changes.tagsAdded && changes.tagsAdded.length > 0;
    default:
      return false;
  }
}

function matchesConditions(
  conditions: Array<{ field: string; operator: string; value: any }>,
  prev: any,
  curr: any
): boolean {
  for (const condition of conditions) {
    const { field, operator, value } = condition;
    console.log("Checking condition:", condition);
    console.log("Field:", field);
    console.log("Operator:", operator);
    console.log("Value:", value);

    const actualValue = curr[field] ?? prev[field];

    // Handle "Any" values
    if (value === "Any Status" || value === "Any Stage" || value === "Any") {
      continue;
    }

    // Convert both values to string and lowercase for safer comparison
    const normalizedActual = String(actualValue).toLowerCase();
    const normalizedExpected = String(value).toLowerCase();

    if (operator === "equals" && normalizedActual !== normalizedExpected) {
      console.log(
        `[Condition Mismatch] Field: ${field}, Expected: ${normalizedExpected}, Found: ${normalizedActual}`
      );
      return false;
    }

    // Optional: You can add other operators like "not_equals", "contains", etc.
  }

  return true;
}

export async function checkAutomationRules(context: AutomationContext) {
  logger.debug("Checking automation rules for task", {
    taskId: context.currentTask.id,
  });

  const rules = await db.automationRule.findMany({
    where: { enabled: true },
  });

  for (const rule of rules) {
    logger.debug(`Evaluating rule: ${rule.name}`, { trigger: rule.trigger });

    const triggerMatch = doesTriggerMatch(
      rule.trigger,
      context.previousTask,
      context.currentTask,
      context.changes
    );

    if (!triggerMatch) {
      logger.debug("Rule trigger not matched", { rule: rule.name });
      continue;
    }

    const enrichedPrev = {
      ...context.previousTask,
      from_stage:
          (context.previousTask as any).stageId || context.previousTask.stage?.id,
      from_status: context.previousTask.status,
    };

    const enrichedCurr = {
      ...context.currentTask,
      to_stage: context.currentTask.stage?.id,
      to_status: context.currentTask.status,
    };

    logger.debug("Checking condition match", {
      conditions: rule.conditions,
      enrichedPrev,
      enrichedCurr,
    });

    const conditionMatch = matchesConditions(
      rule.conditions,
      enrichedPrev,
      enrichedCurr
    );

    if (!conditionMatch) {
      logger.debug("Rule conditions not matched", { rule: rule.name });
      continue;
    }

    logger.debug("Rule matched, executing actions", { rule: rule.name });

    await applyAutomationActions({
      task: context.currentTask,
      rule,
      userId: context.userId,
    });

    if (rule.stopOnFirst) {
      logger.debug("Stopping after first matched rule");
      break;
    }
  }
}

function isDueDateApproaching(dueDate?: Date | null): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const timeDiff = dueDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  return hoursDiff > 0 && hoursDiff <= 24; // Within next 24 hours
}

function isDueDatePassed(dueDate?: Date | null): boolean {
  if (!dueDate) return false;
  return new Date() > dueDate;
}

async function applyAutomationActions({
  task,
  rule,
  userId,
}: {
  task: Partial<TaskWithRelations>;
  rule: AutomationRule;
  userId: string;
}) {
  logger.info(`Executing automation: ${rule.name}`, { actions: rule.actions });

  try {
    await db.$transaction(async (tx: typeof db) => {
      const actions: any[] = Array.isArray((rule as any).actions) ? (rule as any).actions : [];
      for (const action of actions) {
        logger.debug(`Applying action: ${action.type}`, {
          value: action.value,
        });

        switch (action.type) {
          case "move_stage":
            await tx.record.update({
              where: { id: task.id },
              data: { stageId: action.value },
            });
            break;

          case "status_changes":
            await tx.record.update({
              where: { id: task.id },
              data: { status: action.value },
            });
            break;

          case "assign_user":
            await tx.record.update({
              where: { id: task.id },
              data: { assigneeId: action.value },
            });
            break;

          case "add_tag":
            await handleAddTagAction(tx, task.id!, action.value);
            break;

          case "send_notification":
            const targetUserId = action.value.userId || task.assignee?.id;

            console.log("[Emit Test]", { targetUserId });
            const success = await emitToUser(
              targetUserId,
              "new-notification",
              "k"
            );
            console.log("[Emit Result]", success);

            await tx.notification.create({
              data: {
                type: "REMINDER",
                content:
                  action.value.message ||
                  `Automation rule "${rule.name}" was applied`,
                userId: targetUserId,
                taskId: task.id,
              },
            });

            break;

          case "set_due_date":
            await tx.record.update({
              where: { id: task.id },
              data: { dueDate: new Date(action.value) },
            });
            break;

          case "set_priority":
            await tx.record.update({
              where: { id: task.id },
              data: { priority: action.value },
            });
            break;

          default:
            logger.error("Unknown action type", { type: action.type });
        }
      }

      // Log activity
      await tx.taskActivity.create({
        // data: {
        //   taskId: task.id!,
        //   userId,
        //   type: "automation_applied",
        //   description: `Automation rule "${rule.name}" was executed`,
        // },
        data: {
          taskId: (task as any).parentTaskId,
          userId,
          type: "task_created",
          description: `Task "${rule.name}" was created.`,
        },
      });
    });

    logger.info(`Successfully executed automation rule: ${rule.name}`);
  } catch (error) {
    logger.error(`Failed to execute automation rule: ${rule.name}`, error);
    throw error;
  }
}

async function handleAddTagAction(tx: typeof db, recordId: string, tagName: string) {
  if (!tagName) return;
  let tag = await tx.tag.findUnique({ where: { name: tagName } });
  if (!tag) {
    tag = await tx.tag.create({ data: { name: tagName } });
  }
  await tx.record.update({
    where: { id: recordId },
    data: { tags: { connect: { id: tag.id } } },
  });
}

async function createNotification(
  tx: any,
  notification: {
    userId?: string | null;
    type: string;
    content: string;
    metadata?: Record<string, any>;
  }
) {
  if (!notification.userId) return;

  await tx.notification.create({
    data: {
      type: notification.type,
      content: notification.content,
      userId: notification.userId,
      metadata: notification.metadata,
    },
  });
}
