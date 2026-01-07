import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/organizations
 * Super admin: Get all organizations with their stats
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    let whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search, 
          // mode: "insensitive"
         } },
        { primaryEmail: { contains: search, 
          // mode: "insensitive"
         } },
      ]
    }

    if (status === "suspended") {
      whereClause.suspended = true
    } else if (status === "active") {
      whereClause.suspended = false
    }

    const organizations = await db.organization.findMany({
      where: whereClause,
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            Channel: true,
            Task: true,
            Message: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(organizations)
  } catch (error: any) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/superadmin/organizations
 * Super admin: Create a new organization
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const data = await req.json()
    const { name, industry, primaryEmail, phone, address, adminEmail, adminName } = data

    // Generate slug from name
    const baseSlug = String(name || "").toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-')
      .slice(0, 48)
    let slug = baseSlug || undefined
    if (slug) {
      // ensure uniqueness
      let attempt = 0
      let candidate = slug
      while (await db.organization.findUnique({ where: { slug: candidate } })) {
        attempt += 1
        candidate = `${slug}-${attempt}`.slice(0, 60)
      }
      slug = candidate
    }

    // Create organization with trial
    const trialStart = new Date()
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14) // 14 day trial

    const organization = await db.organization.create({
      data: {
        name,
        slug,
        industry,
        primaryEmail,
        phone,
        address,
        trialStart,
        trialEnd,
        trialStatus: "ACTIVE",
      },
    })

    // Create subscription
    await db.subscription.create({
      data: {
        organizationId: organization.id,
        status: "TRIAL",
        trialStart,
        trialEnd,
        trialUsed: true,
      },
    })

    // Create admin user if provided
    if (adminEmail && adminName) {
      const bcrypt = require("bcryptjs")
      const defaultPassword = await bcrypt.hash("ChangeMe123!", 10)

      await db.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: defaultPassword,
          role: "ORG_ADMIN",
          organizationId: organization.id,
        },
      })
    }

    return NextResponse.json(organization, { status: 201 })
  } catch (error: any) {
    console.error("Error creating organization:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
