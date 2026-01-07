

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { verifyToken } from "@/lib/tokens"
// Legacy individual registration (task invites) and org invites acceptance. Org trial handled in /api/organizations/register

export async function POST(req: Request) {
  try {
  const { name, email, password, department, token } = await req.json()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" }, 
        { status: 400 }
      )
    }

    // Validate invitation token if present (task or org invite)
    let taskInvitation = null
    let orgInvite = null as any
    if (token) {
      const validToken = await verifyToken(token, email)
      if (!validToken) {
        return NextResponse.json(
          { message: "Invalid or expired invitation token" },
          { status: 400 }
        )
      }

      taskInvitation = await db.taskInvitation.findFirst({
        where: {
          email,
          taskId: validToken.taskId,
          accepted: false
        },
        include: {
          task: true
        }
      })

      if (!taskInvitation) {
        // check org invites
        orgInvite = await db.orgInvite.findFirst({ where: { token, email, accepted: false } })
        if (!orgInvite) {
          return NextResponse.json(
            { message: "No valid invitation found for this email" },
            { status: 400 }
          )
        }
      }
    }

    // Check if department exists, create if not
    let departmentRecord = await db.department.findFirst({
      where: { name: department },
    })

    if (!departmentRecord) {
      departmentRecord = await db.department.create({
        data: { name: department },
      })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user with CLIENT role if registering via invitation
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        departmentId: departmentRecord.id,
        role: taskInvitation ? taskInvitation.role : orgInvite ? orgInvite.role : "EMPLOYEE", // Default role or from invitation
        organizationId: orgInvite ? orgInvite.organizationId : undefined,
      },
    })

    // Subscription is now organization-based; no per-user subscription created here

    
    // Create department channel if it doesn't exist
    const departmentChannel = await db.channel.findFirst({
      where: {
        departmentId: departmentRecord.id,
        isDepartment: true,
      },
    })

    if (!departmentChannel) {
      const newDepartmentChannel = await db.channel.create({
        data: {
          name: `${department}-department`,
          description: `Official channel for ${department} `,
          isPublic: true,
          isDepartment: true,
          creatorId: user.id,
          departmentId: departmentRecord.id,
        },
      })

      // Add user to department channel
      await db.channelMember.create({
        data: {
          userId: user.id,
          channelId: newDepartmentChannel.id,
        },
      })
    } else {
      // Add user to existing department channel
      await db.channelMember.create({
        data: {
          userId: user.id,
          channelId: departmentChannel.id,
        },
      })
    }

  // Handle task invitation if present
    if (taskInvitation) {
      // Add user to the task
      await db.taskClient.create({
        data: {
          taskId: taskInvitation.taskId,
          userId: user.id,
          accessLevel: taskInvitation.accessLevel,
          role: taskInvitation.role,
        },
      })

      // Mark invitation as accepted
      await db.taskInvitation.update({
        where: { id: taskInvitation.id },
        data: { accepted: true },
      })

      // Add user to task channels
      const taskChannels = await db.channel.findMany({
        where: {
          taskReferenceId: taskInvitation.taskId,
          OR: [
            { name: { contains: "Client" } },
            { name: { contains: taskInvitation.task.title } }
          ],
        },
      })

      for (const channel of taskChannels) {
        await db.channelMember.create({
          data: {
            userId: user.id,
            channelId: channel.id,
            isAdmin: false,
          },
        })
      }

      // Delete the used token
      await db.invitationToken.delete({
        where: { token },
      })

      // Send welcome notification
      await db.notification.create({
        data: {
          type: "TASK_ASSIGNED",
          content: `You now have access to task: ${taskInvitation.task.title}`,
          userId: user.id,
          taskId: taskInvitation.taskId,
        },
      })
    }

    // Handle organization invite acceptance
    if (orgInvite) {
      await db.orgInvite.update({ where: { id: orgInvite.id }, data: { accepted: true } })
      await db.activityLog.create({
        data: {
          organizationId: orgInvite.organizationId,
          userId: user.id,
          action: "ORG_USER_JOINED",
          details: { email },
        } as any,
      })
    }

    return NextResponse.json(
      { 
        message: "User registered successfully",
        hasTaskAccess: !!taskInvitation,
        taskId: taskInvitation?.taskId 
      }, 
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Something went wrong" }, 
      { status: 500 }
    )
  }
}