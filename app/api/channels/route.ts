import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getScopedDb } from "@/lib/scoped-db"
import { sendEmail } from "@/lib/email"
import { emitToUser } from "@/lib/socket-server"
import { getTenantWhereClause, getSessionUserWithPermissions } from "@/lib/org"
import { hasPermission, requirePermission } from "@/lib/permissions"

export async function GET(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    
    // Check if user is super admin
    const userWithPerms = await getSessionUserWithPermissions(req as any)
    const isSuperAdmin = userWithPerms.isSuperAdmin
    
    // Parse user permissions - handle both array and string formats
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
    
    let whereClause: any = {}
    
    // Super admins can see all channels
    // Users with CHANNEL_VIEW_ALL can see all org channels
    // Regular users only see channels they're members of in their organization
    if (isSuperAdmin) {
      // No restrictions for super admin
    } else {
      whereClause.organizationId = user?.organizationId
      
      // Check if user has CHANNEL_VIEW_ALL permission
      const canViewAll = hasPermission(userWithPerms.role, 'CHANNEL_VIEW_ALL', isSuperAdmin, userPerms)
      
      if (!canViewAll) {
        // Only show channels user is a member of or public channels
        whereClause.OR = [
          { isPublic: true },
          { members: { some: { userId: user.id } } }
        ]
      }
    }
    
    const channels = await db.channel.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        isPublic: true,
        isDepartment: true,
        isTaskThread: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        department: { select: { name: true } },
      },
    })

    return NextResponse.json(channels)
  } catch (error) {
    console.error("Error fetching channels:", error)
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

    const { name, description, isPublic, departmentId, members } = await req.json()
    const orgId = user?.organizationId

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
    
    // 🔍 DEBUG: Log permission check details
    console.log('🔍 POST /api/channels permission check:', {
      userId: userWithPerms.id,
      role: userWithPerms.role,
      isSuperAdmin,
      rawPermissions: rawPerms,
      parsedPermissions: userPerms,
    })

    // ✅ ENFORCE PERMISSION: CHANNEL_CREATE required (or CHANNEL_MANAGE as fallback)
    const canCreateChannel = hasPermission(userWithPerms.role, "CHANNEL_CREATE", isSuperAdmin, userPerms)
    const canManageChannel = hasPermission(userWithPerms.role, "CHANNEL_MANAGE", isSuperAdmin, userPerms)
    
    console.log('🔍 Permission results:', { canCreateChannel, canManageChannel })
    
    if (!canCreateChannel && !canManageChannel) {
      return NextResponse.json(
        { message: "Forbidden: You need CHANNEL_CREATE permission to create channels" },
        { status: 403 }
      )
    }

    // Normalize and validate departmentId
    let depId: string | null = null
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'none') {
      const dept = await db.department.findUnique({ where: { id: departmentId }, select: { id: true } })
      depId = dept ? departmentId : null
    }

    // Create channel and members
    const channel = await db.channel.create({
      data: {
        name,
        description,
        isPublic,
        creatorId: user.id,
        departmentId: depId,
        organizationId: orgId,
        members: {
          create: [
            { userId: user.id, isAdmin: true },
            ...(members || []).map((memberId: string) => ({
              userId: memberId,
              isAdmin: false,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: true, // so we get emails for sending
          },
        },
      },
    })

    // Send notifications and emails to members (excluding creator)
    for (const member of channel.members) {
      if (member.userId === user.id) continue

      const memberUser = member.user
      const email = memberUser.email
      const name = memberUser.name || "Team Member"

      // 🔔 Create notification
      const notification = await db.notification.create({
        data: {
          type: "CHANNEL_INVITE",
          channelId:channel.id,
          userId: member.userId,
          content: `You've been added to the channel "${channel.name}"`,
          read: false,
        },
      })

      console.log("🔔 Notification created:", notification.id)

      // 📡 Emit socket notification
      const emitted = emitToUser(member.userId, "new-notification", notification)
      console.log("📡 Socket emitted to:", member.userId, emitted)

      // 📡 Emit channel-assigned event so user's sidebar refreshes immediately
      emitToUser(member.userId, "channel:assigned", {
        channelId: channel.id,
        channelName: channel.name,
        channelDescription: channel.description,
      })
      console.log("📡 Channel assignment emitted to:", member.userId)

      // 📧 Send email
      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: `You've been added to a new channel: ${channel.name}`,
            html: `
              <p>Hi ${name},</p>
              <p>You've been added to a new channel: <strong>${channel.name}</strong>.</p>
              <p>Description: ${channel.description || "No description provided."}</p>
              <p>Thanks,<br/>Task Manager Team</p>
            `,
          })
          console.log(`📧 Email sent to ${email}`)
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${email}:`, emailErr)
        }
      }
    }

    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error("Error creating channel:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

