import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/stats
 * Super admin: Get system-wide statistics
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      totalTasks,
      totalChannels,
      totalMessages,
      activeTrials,
      expiredTrials,
    ] = await Promise.all([
      db.organization.count(),
      db.organization.count({ where: { suspended: false } }),
      db.organization.count({ where: { suspended: true } }),
      db.user.count(),
      db.task.count(),
      db.channel.count(),
      db.message.count(),
      db.organization.count({ where: { trialStatus: "ACTIVE" } }),
      db.organization.count({ where: { trialStatus: "EXPIRED" } }),
    ])

    // Get recent activity
    const recentOrganizations = await db.organization.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        trialStatus: true,
      },
    })

    const recentUsers = await db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        organization: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
    })

    // Get organization growth (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const newOrganizationsCount = await db.organization.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    const stats = {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        suspended: suspendedOrganizations,
        newThisMonth: newOrganizationsCount,
      },
      trials: {
        active: activeTrials,
        expired: expiredTrials,
      },
      users: {
        total: totalUsers,
      },
      tasks: {
        total: totalTasks,
      },
      channels: {
        total: totalChannels,
      },
      messages: {
        total: totalMessages,
      },
      recent: {
        organizations: recentOrganizations,
        users: recentUsers,
      },
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
