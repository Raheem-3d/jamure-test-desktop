import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { computeTrialWindow, getIstNowUtc } from "@/lib/subscription-utils"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      companyName,
      industry,
      employees,
      primaryEmail,
      phone,
      address,
      adminName,
      adminEmail,
      password,
    } = body || {}

    if (!companyName || !primaryEmail || !adminName || !adminEmail || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Enforce unique organization by primaryEmail (and optionally name)
    const existingOrg = await db.organization.findFirst({
      where: { OR: [{ primaryEmail }, { name: companyName }] },
    })
    if (existingOrg) {
      return NextResponse.json({ message: "Organization already exists" }, { status: 400 })
    }

    // Ensure org admin user email isn't already taken
    const existingUser = await db.user.findUnique({ where: { email: adminEmail } })
    if (existingUser) {
      return NextResponse.json({ message: "Organization admin email already in use" }, { status: 400 })
    }

    // Create organization (with unique slug)
    const nowUtc = getIstNowUtc()
    const { trialStartUtc, trialEndUtc } = computeTrialWindow(nowUtc)

    // Generate slug from companyName and ensure uniqueness
    const baseSlug = String(companyName || "").toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-')
      .slice(0, 48)
    let slug: string | undefined = baseSlug || undefined
    if (slug) {
      let attempt = 0
      let candidate = slug
      while (await db.organization.findUnique({ where: { slug: candidate } })) {
        attempt += 1
        candidate = `${slug}-${attempt}`.slice(0, 60)
      }
      slug = candidate
    }

    const organization = await db.organization.create({
      data: {
        name: companyName,
        slug,
        industry: industry || null,
        employeesCount: employees ?? null,
        primaryEmail,
        phone: phone || null,
        address: address || null,
        trialStart: trialStartUtc,
        trialEnd: trialEndUtc,
        trialStatus: "ACTIVE",
      },
    })

    // Create org admin user in this org
    const hashed = await hash(password, 10)
    const admin = await db.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashed,
        role: "ORG_ADMIN",
        organizationId: organization.id,
      },
    })

    // Create organization-level subscription record
    await db.subscription.create({
      data: {
        organizationId: organization.id,
        status: "TRIAL",
        trialStart: trialStartUtc,
        trialEnd: trialEndUtc,
        trialUsed: true,
      },
    })

    // Activity log
    await db.activityLog.create({
      data: {
        organizationId: organization.id,
        userId: admin.id,
        action: "ORG_CREATED",
        details: { by: adminEmail },
      } as any,
    })

    return NextResponse.json({ message: "Organization created", organizationId: organization.id, slug: organization.slug }, { status: 201 })
  } catch (error) {
    console.error("Organization registration error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
