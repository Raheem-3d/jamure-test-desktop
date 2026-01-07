import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

type NotificationItem = {
  id: string
  type: "TRIAL_EXPIRING" | "NEW_ORG" | "IMPERSONATION"
  title: string
  description?: string
  timestamp: string
  link?: string
  meta?: Record<string, any>
}

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10) || 15, 50)
    const lookbackDays = Math.min(parseInt(searchParams.get("lookbackDays") || "7", 10) || 7, 90)

    const now = new Date()
    const soon = daysFromNow(7)
    const recentWindow = daysAgo(lookbackDays)

    // Trials expiring within next 7 days
    const trials = await db.subscription.findMany({
      where: {
        status: "TRIAL",
        trialEnd: {
          gte: now,
          lte: soon,
        },
      },
      orderBy: { trialEnd: "asc" },
      take: 20,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    const trialItems: NotificationItem[] = trials.map((t) => ({
      id: `trial:${t.organizationId}`,
      type: "TRIAL_EXPIRING",
      title: `${t.organization?.name || "Organization"} trial expiring soon`,
      description: `Ends on ${new Date(t.trialEnd).toLocaleDateString()}`,
      timestamp: new Date(t.trialEnd).toISOString(),
      link: `/${t.organization?.slug || t.organizationId}`,
      meta: {
        organizationId: t.organizationId,
        slug: t.organization?.slug,
        trialEnd: t.trialEnd,
      },
    }))

    // Recently created organizations
    const recentOrgs = await db.organization.findMany({
      where: { createdAt: { gte: recentWindow } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, slug: true, createdAt: true },
    })

    const newOrgItems: NotificationItem[] = recentOrgs.map((o) => ({
      id: `neworg:${o.id}`,
      type: "NEW_ORG",
      title: `New organization: ${o.name}`,
      description: o.slug ? `/${o.slug}` : undefined,
      timestamp: o.createdAt.toISOString(),
      link: `/${o.slug || o.id}`,
      meta: { organizationId: o.id, slug: o.slug },
    }))

    // Impersonation start events in lookback window
    const impersonations = await db.activityLog.findMany({
      where: {
        action: "IMPERSONATE_START",
        createdAt: { gte: recentWindow },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    const impersonationItems: NotificationItem[] = impersonations.map((e) => ({
      id: `imp:${e.id}`,
      type: "IMPERSONATION",
      title: `Impersonation started: ${e.organization?.name || e.organizationId}`,
      description: e.user?.email || e.user?.name || undefined,
      timestamp: e.createdAt.toISOString(),
      link: `/admin/organizations/${e.organizationId}`,
      meta: {
        organizationId: e.organizationId,
        slug: e.organization?.slug,
        userId: e.userId,
      },
    }))

    const all: NotificationItem[] = [...trialItems, ...newOrgItems, ...impersonationItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({ items: all, count: all.length })
  } catch (error: any) {
    console.error("Error fetching superadmin notifications:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
