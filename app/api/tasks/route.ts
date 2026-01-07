

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { emitToUser } from "@/lib/socket-server"
import { subDays, subHours,addMinutes  } from "date-fns"
import { sendEmail } from "@/lib/email"
import { getTenantWhereClause, getSessionUserWithPermissions } from "@/lib/org"
import { hasPermission, requirePermission } from "@/lib/permissions"
const crypto = require('crypto');

export async function GET(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const assignedTo = searchParams.get("assignedTo")
    const createdBy = searchParams.get("createdBy")

    // Check if user is super admin
    const userWithPerms = await getSessionUserWithPermissions(req as any)
    const isSuperAdmin = userWithPerms.isSuperAdmin

    // Parse user permissions
    let userPerms: any[] = []
    try {
      userPerms = JSON.parse(String(userWithPerms.permissions || '[]'))
    } catch {}

    let whereClause: any = {}

    // Super admins can see all tasks
    // Users with TASK_VIEW_ALL can see all org tasks
    // Regular users see only their own/assigned tasks
    if (!isSuperAdmin) {
      whereClause.organizationId = user?.organizationId || undefined
      
      // Check if user has TASK_VIEW_ALL permission
      const canViewAll = hasPermission(userWithPerms.role, 'TASK_VIEW_ALL', isSuperAdmin, userPerms)
      
      if (!canViewAll) {
        // Only show tasks created by or assigned to the user
        whereClause.OR = [
          { creatorId: user.id },
          { assignments: { some: { userId: user.id } } }
        ]
      }
    }

    // If assignedTo is specified, filter by assignments
    if (assignedTo) {
      whereClause.assignments = {
        some: {
          userId: assignedTo,
        },
      }
    }
    // If createdBy is specified, filter by creator
    else if (createdBy) {
      whereClause.creatorId = createdBy
    }
    // Otherwise, for non-super-admins, show tasks user is involved in
    else if (!isSuperAdmin) {
      whereClause.OR = [
        { creatorId: user.id },
        {
          assignments: {
            some: {
              userId: user.id,
            },
          },
        },
      ]
    }

    // Add additional filters
    if (status) {
      whereClause.status = status
    }

    if (priority) {
      whereClause.priority = priority
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
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
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          priority: "desc",
        },
        {
          deadline: "asc",
        },
      ],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}






export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Read request body for task creation
    const { title, description, priority, deadline, deadlineRange, assignees, clientEmails } = await req.json();

    // Normalize deadline inputs (single date or range)
    let finalDeadline: Date | null = null;
    let deadlineStart: Date | null = null;
    let deadlineEnd: Date | null = null;

    if (deadlineRange?.from) {
      const from = new Date(deadlineRange.from);
      const to = new Date(deadlineRange.to ?? deadlineRange.from);
      deadlineStart = from;
      deadlineEnd = to;
      finalDeadline = to; // keep existing sorting/logic using deadline as the end of range
    } else if (deadline) {
      const d = new Date(deadline);
      deadlineStart = d;
      deadlineEnd = d;
      finalDeadline = d;
    }

    // Get user with permissions to check super admin status
    const userWithPerms = await getSessionUserWithPermissions(req as any)
    const isSuperAdmin = userWithPerms.isSuperAdmin

    // Parse user's explicit permissions from DB - handle both array and string formats
    let userPerms: any[] = []
    const rawPerms = userWithPerms.permissions
    if (Array.isArray(rawPerms)) {
      userPerms = rawPerms
    } else if (typeof rawPerms === 'string' && rawPerms) {
      try {
        userPerms = JSON.parse(rawPerms)
      } catch {
        userPerms = []
      }
    }
    
    

    // ✅ ENFORCE PERMISSION: TASK_CREATE required (or PROJECT_MANAGE as fallback)
    const canCreateTask = hasPermission(userWithPerms.role, "TASK_CREATE", isSuperAdmin, userPerms)
    const canManageProject = hasPermission(userWithPerms.role, "PROJECT_MANAGE", isSuperAdmin, userPerms)
    

    
    if (!canCreateTask && !canManageProject) {
      return NextResponse.json(
        { message: "Forbidden: You need TASK_CREATE permission to create tasks" },
        { status: 403 }
      )
    }

    // Create task
    let task;
    try {
      // Preferred path: stores deadlineStart/deadlineEnd when available in DB schema
      task = await db.task.create({
        data: {
          title,
          description,
          priority,
          deadline: finalDeadline,
          // These fields require a schema migration; if missing, we fallback below
          // @ts-ignore - allow runtime environments without these columns
          deadlineStart: deadlineStart ?? null,
          // @ts-ignore
          deadlineEnd: deadlineEnd ?? null,
          creatorId: user.id,
          organizationId: user?.organizationId || undefined,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    } catch (e: any) {
      // Backward-compatible fallback if Prisma client/schema doesn't yet know these fields
      const msg = String(e?.message || "");
      if (msg.includes("Unknown argument `deadlineStart`") || msg.includes("deadlineStart") || msg.includes("deadlineEnd")) {
        task = await db.task.create({
          data: {
            title,
            description,
            priority,
            deadline: finalDeadline,
            creatorId: user.id,
            organizationId: user?.organizationId || undefined,
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        });
      } else {
        throw e;
      }
    }

    // Get all users with role ORG_ADMIN or CLIENT
    const adminAndClientUsers = await db.user.findMany({
      where: {
        role: {
          in: ['ORG_ADMIN', 'CLIENT'],
        },
        organizationId: user?.organizationId || undefined,
      },
      select: {
        id: true,
      },
    });


  const onlyAdminRole = await db.user.findMany({
    where: {
      role: 'ORG_ADMIN',
      organizationId: user?.organizationId || undefined,
    },
    select: {
      id: true,
    },
  });

    // Create task thread channel
    const channelName = `Internal-${task.title}`;

    // const channel = await db.channel.create({
    //   data: {
    //     name: channelName,
    //     description: `Discussion thread for task: ${title}`,
    //     isPublic: false,
    //     isTaskThread: true,
    //     taskId: task.id,
    //     creatorId: user.id,
    //     organizationId: user?.organizationId || undefined,
    //     members: {
    //       create: [
    //         {
    //           userId: user.id,
    //           isAdmin: true,
    //         },
    //         ...adminAndClientUsers
    //           .filter((u: any) => u.id !== user.id) // Avoid duplication
    //           .map((user: any) => ({
    //             userId: user.id,
    //             isAdmin: false,
    //           })),
    //       ],
    //     },
    //   },
    // });


    // Assuming task.assigneeId exists and is the user assigned to the task
const channel = await db.channel.create({
  data: {
    name: `Internal-${task.title}`,
    description: `Discussion thread for task: ${task.title}`,
    isPublic: false,
    isTaskThread: true,
    taskId: task.id,
    creatorId: user.id,
    organizationId: user?.organizationId,
    members: {
      create: [
        {
          userId: user.id,
          isAdmin: true, // creator is admin
        },
        ...(task.assigneeId && task.assigneeId !== user.id
          ? [{ userId: task.assigneeId, isAdmin: false }]
          : []),
      ],
    },
  },
});

   const channelOnlyForAdmin = await db.channel.create({
      data: {
       name: `Task-${task.title}-OrgAdmin`,
       description: `Discussion thread for task: ${title} (Admins only)`,
       isPublic: false,
       isTaskThread: true,
       taskReferenceId: task.id,
       creatorId: user.id,
       organizationId: user?.organizationId || undefined,
       members: {
         create: [
           {
             userId: user.id,
             isAdmin: true,
           },
           ...onlyAdminRole
            .filter((u: any) => u.id !== user.id) // Avoid duplication
            .map((u: any) => ({
              userId: u.id,
               isAdmin: false,
             })),
         ],
       },
     },
   });

    // Handle assignees
    if (assignees && assignees.length > 0) {
      const assignmentPromises = assignees.map(async (assigneeId: string) => {
        // Create assignment
        const assignment = await db.taskAssignment.create({
          data: {
            taskId: task.id,
            userId: assigneeId,
          },
        });

        // Add to channel (idempotent)
        await db.channelMember.upsert({
          where: {
            userId_channelId: { userId: assigneeId, channelId: channel.id },
          },
          create: {
            userId: assigneeId,
            channelId: channel.id,
          },
          update: {},
        })

        // Create notification
        const notification = await db.notification.create({
          data: {
            type: "TASK_ASSIGNED",
            content: `You have been assigned to task: ${task.title}`,
            userId: assigneeId,
            taskId: task.id,
          },
        });

        // Emit via socket
        const notificationEmitted = emitToUser(assigneeId, "new-notification", notification);
        console.log("🔔 Socket notification emitted:", notificationEmitted);

        // 📡 Emit task-assigned event so user's sidebar refreshes immediately
        emitToUser(assigneeId, "task:assigned", {
          taskId: task.id,
          taskTitle: task.title,
          taskPriority: task.priority,
        });
        console.log("📡 Task assignment emitted to:", assigneeId);

        // Get assignee email
        const assignee = await db.user.findUnique({
          where: { id: assigneeId },
          select: { email: true },
        });

        console.log(assignee, 'assign');

        // Send email
        if (assignee?.email) {
          try {
            await sendEmail({
              to: assignee.email,
              subject: `🔔 TASK_ASSIGNED: ${task.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">🔔 Task Assignment Notification</h2>
                  <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h3 style="margin-top: 0; color: #111827;">${task.title}</h3>
                    <p><strong>Description:</strong> ${task.description || "No description provided"}</p>
                    <p><strong>Priority:</strong> ${task.priority}</p>
                    <p><strong>Deadline:</strong> ${task.deadline ? new Date(task.deadline).toLocaleString() : "No deadline"}</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; text-align: center;">
                    This is an automated message from the Task Manager system.
                  </p>
                </div>
              `,
            })
          } catch (e) {
            console.error("Error sending assignment email:", e)
          }
        }

        return assignment;
      });

      await Promise.all(assignmentPromises);

      if (finalDeadline) {
        await createAutomaticTaskReminders(
          task.id,
          task.title,
          new Date(finalDeadline),
          assignees
        );
      }
    }

    // Handle client emails and create TaskInvitations
    if (clientEmails && clientEmails.length > 0) {
      const clientInvitationPromises = clientEmails.map(async (clientData: any) => {
        const { email, role, access } = clientData;

        // Check if user already exists
        let clientUser = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // If user doesn't exist, create invitation
        if (!clientUser) {
          // Generate invitation token
          const token = await generateInvitationToken(email, task.id);

          // Create task invitation
          const invitation = await db.taskInvitation.create({
            data: {
              taskId: task.id,
              email: email.toLowerCase(),
              role: role || "CLIENT",
              accessLevel: access || "VIEW",
              invitedById: user.id,
              accepted: false,
            },
          });

          // Send invitation email
          const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;
          
          try {
            await sendEmail({
              to: email,
              subject: `🎯 You've been invited to collaborate on: ${task.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">🎯 Task Collaboration Invitation</h2>
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #111827;">${task.title}</h3>
                    <p><strong>Description:</strong> ${task.description || "No description provided"}</p>
                    <p><strong>Priority:</strong> ${task.priority}</p>
                    <p><strong>Deadline:</strong> ${task.deadline ? new Date(task.deadline).toLocaleString() : "No deadline"}</p>
                    <p><strong>Your Access Level:</strong> <span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px; color: #1e40af;">${access}</span></p>
                  </div>
                  <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0 0 12px 0;"><strong>Access Permissions:</strong></p>
                    ${access === 'VIEW' ? '<p style="margin: 4px 0;">✓ View task details</p><p style="margin: 4px 0;">✗ Cannot edit or comment</p>' : ''}
                    ${access === 'COMMENT' ? '<p style="margin: 4px 0;">✓ View task details</p><p style="margin: 4px 0;">✓ Add comments</p><p style="margin: 4px 0;">✗ Cannot edit task</p>' : ''}
                    ${access === 'EDIT' ? '<p style="margin: 4px 0;">✓ View task details</p><p style="margin: 4px 0;">✓ Add comments</p><p style="margin: 4px 0;">✓ Edit task details</p>' : ''}
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                      Accept Invitation & View Task
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; text-align: center;">
                    This invitation will expire in 7 days.
                  </p>
                </div>
              `,
            })
          } catch (e) {
            console.error("Error sending client invitation email:", e)
          }

          console.log(`📧 Invitation email sent to ${email}`);
          return invitation;
        } else {
          // If user exists, create TaskClient relationship directly
          const taskClient = await db.taskClient.create({
            data: {
              taskId: task.id,
              userId: clientUser.id,
              role: role || "CLIENT",
              accessLevel: access || "VIEW",
            },
          });

          // Add client to task channel based on access level 
          if (access === 'EDIT' || access === 'COMMENT') {
            try {
              await db.channelMember.create({
                data: {
                  userId: clientUser.id,
                  channelId: channel.id,
                  isAdmin: false,
                },
              });
            } catch (err) {
              // Ignore if already member
              console.log("Client already a channel member");
            }
          }

          // Create notification
          const notification = await db.notification.create({
            data: {
              type: "TASK_ASSIGNED",
              content: `You have been given ${access} access to task: ${task.title}`,
              userId: clientUser.id,
              taskId: task.id,
            },
          });

          // Emit socket notification
          emitToUser(clientUser.id, "new-notification", notification);

          // Send email notification
          try {
            await sendEmail({
              to: clientUser.email!,
              subject: `🎯 You've been added to: ${task.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">🎯 Task Access Granted</h2>
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #111827;">${task.title}</h3>
                    <p><strong>Description:</strong> ${task.description || "No description provided"}</p>
                    <p><strong>Priority:</strong> ${task.priority}</p>
                    <p><strong>Deadline:</strong> ${task.deadline ? new Date(task.deadline).toLocaleString() : "No deadline"}</p>
                    <p><strong>Your Access Level:</strong> <span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px; color: #1e40af;">${access}</span></p>
                  </div>
                  <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0 0 12px 0;"><strong>You can:</strong></p>
                    ${access === 'VIEW' ? '<p style="margin: 4px 0;">✓ View task details</p>' : ''}
                    ${access === 'COMMENT' ? '<p style="margin: 4px 0;">✓ View and add comments</p>' : ''}
                    ${access === 'EDIT' ? '<p style="margin: 4px 0;">✓ View, edit, and comment</p>' : ''}
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tasks/${task.id}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                      View Task
                    </a>
                  </div>
                </div>
              `,
            })
          } catch (e) {
            console.error("Error sending client notification email:", e)
          }

          console.log(`📧 Notification email sent to existing user ${email}`);
          return taskClient;
        }
      });

      await Promise.all(clientInvitationPromises);
      console.log(`✅ Processed ${clientEmails.length} client invitations`);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}





export async function PUT(req: Request, { params }: { params: { taskId: string } }) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth');
    const user: any = await getSessionOrMobileUser(req as any);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is org admin or manager
    const userRec = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    });

    if (!userRec || (userRec.role !== "ORG_ADMIN" && userRec.role !== "MANAGER")) {
      return NextResponse.json({ 
        message: "Only organization admins and managers can update tasks" 
      }, { status: 403 });
    }

    // Parse all fields from request
    const { 
      title, 
      description, 
      status, 
      priority, 
      deadline, 
      deadlineRange,  // Add this
      assignees, 
      clientEmails    // Add this
    } = await req.json();

    console.log("📦 Update request data:", {
      title,
      status,
      priority,
      deadline,
      deadlineRange,
      assigneesCount: assignees?.length,
      clientEmailsCount: clientEmails?.length
    });

    const orgId = user.organizationId;
    const task = await db.task.findUnique({
      where: {
        id: params.taskId,
      },
      include: {
        assignments: true,
        channel: true,
        clientEmails: true,  // Add this
      },
    });

    if (!task || (orgId && (task as any).organizationId && (task as any).organizationId !== orgId)) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      title,
      description,
      status,
      priority,
      deadline: deadline ? new Date(deadline) : null,
    };

    // Handle deadline range
    if (deadlineRange) {
      updateData.deadlineRangeFrom = deadlineRange.from ? new Date(deadlineRange.from) : null;
      updateData.deadlineRangeTo = deadlineRange.to ? new Date(deadlineRange.to) : null;
    } else {
      // Clear range if not provided
      updateData.deadlineRangeFrom = null;
      updateData.deadlineRangeTo = null;
    }

    // Update task
    const updatedTask = await db.task.update({
      where: {
        id: params.taskId,
      },
      data: updateData,
    });

    // Handle assignees (existing code)
    const currentAssigneeIds = task.assignments.map((a: any) => a.userId);
    const assigneesToRemove = currentAssigneeIds.filter((id: any) => !assignees.includes(id));
    const assigneesToAdd = assignees.filter((id: any) => !currentAssigneeIds.includes(id));

    if (assigneesToRemove.length > 0) {
      await db.taskAssignment.deleteMany({
        where: {
          taskId: params.taskId,
          userId: { in: assigneesToRemove },
        },
      });
    }

    if (assigneesToAdd.length > 0) {
      const assignmentPromises = assigneesToAdd.map((userId: string) =>
        db.taskAssignment.create({ data: { taskId: params.taskId, userId } })
      );
      await Promise.all(assignmentPromises);

      if (task.channel) {
        const channelMemberPromises = assigneesToAdd.map((userId: string) =>
          db.channelMember.create({
            data: { userId, channelId: task.channel.id },
          })
        );
        await Promise.all(channelMemberPromises);
      }

      // 🔡 Emit task assignment events to new assignees for real-time updates
      for (const userId of assigneesToAdd) {
        emitToUser(userId, "task:assigned", {
          taskId: params.taskId,
          taskTitle: task.title,
          taskPriority: task.priority,
        });
        console.log("🔡 Task assignment emitted to:", userId);
      }
    }

    // Handle client emails - NEW SECTION
    if (clientEmails !== undefined) {
      // Delete existing client emails
      await db.clientEmail.deleteMany({
        where: { taskId: params.taskId }
      });

      // Create new client emails if provided
      if (clientEmails && clientEmails.length > 0) {
        const clientEmailPromises = clientEmails.map((client: any) =>
          db.clientEmail.create({
            data: {
              email: client.email,
              role: client.role || 'CLIENT',
              access: client.access || 'VIEW',
              taskId: params.taskId,
              invitedById: user.id,
            }
          })
        );
        await Promise.all(clientEmailPromises);
      }
    }

    // Fetch complete task with all relations
    const finalTask = await db.task.findUnique({
      where: { id: params.taskId },
      include: {
        creator: true,
        assignments: { include: { user: true } },
        channel: true,
        clientEmails: true,  // Include client emails
      },
    });

    // 🔔 Send notifications to all assignees (except updater)
    const updatedBy = userRec.name || userRec.email || "Someone";
    const notificationContent = `Task "${finalTask?.title}" was updated by ${updatedBy}`;

    for (const assignment of finalTask?.assignments || []) {
      if (assignment.userId === user.id) continue;

      const notification = await db.notification.create({
        data: {
          type: "TASK_ASSIGNED",
          content: notificationContent,
          userId: assignment.userId,
          read: false,
        },
      });

      emitToUser(assignment.userId, "new-notification", notification);
    }

    return NextResponse.json(finalTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ 
      message: "Something went wrong",
      error: error.message 
    }, { status: 500 });
  }
}

async function generateInvitationToken(email: string, taskId: string) {
  // Implement your token generation logic here
  // This could use JWT or a database-stored token
  // Example:
  const token = crypto.randomBytes(32).toString('hex');
  
  await db.invitationToken.create({
    data: {
      token,
      email,
      taskId,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    }
  });

  return token;
}




async function createAutomaticTaskReminders(taskId: string, taskTitle: string, deadline: Date, assigneeIds: string[]) {
  const reminderIntervals = [
    { days: 4, hours: 0, label: "4 days before" },
    { days: 2, hours: 0, label: "2 days before" },
    { days: 1, hours: 0, label: "1 day before" },
    { days: 0, hours: 5, label: "5 hours before" },
    { days: 0, hours: 2, label: "2 hours before" },
  ]

  const reminderPromises = []

  for (const assigneeId of assigneeIds) {
    for (const interval of reminderIntervals) {
      let reminderTime = new Date(deadline)

      if (interval.days > 0) {
        reminderTime = subDays(reminderTime, interval.days)
      }
      if (interval.hours > 0) {
        reminderTime = subHours(reminderTime, interval.hours)
      }

      // Only create reminder if it's in the future
      if (reminderTime > new Date()) {
        reminderPromises.push(
          db.reminder.create({
            data: {
              title: `Task Deadline Reminder: ${taskTitle}`,
              description: `This is an automatic reminder for your task "${taskTitle}" which is due ${interval.label}.`,
              remindAt: reminderTime,
              priority: interval.days === 0 ? "HIGH" : "MEDIUM",
              type: "TASK_DEADLINE",
              creatorId: assigneeId, // System-created, but assigned to user
              assigneeId: assigneeId,
              isAutomatic: true,
            },
          }),
        )
      }
    }
  }

  if (reminderPromises.length > 0) {
    await Promise.all(reminderPromises)
    console.log(`Created ${reminderPromises.length} automatic reminders for task: ${taskTitle}`)
  }
}

