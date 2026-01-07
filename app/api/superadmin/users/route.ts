import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/users
 * Super admin: Get all users across all organizations
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const organizationId = searchParams.get("organizationId")
    const role = searchParams.get("role")

    let whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search,
          //  mode: "insensitive"
           } },
        { email: { contains: search, 
          // mode: "insensitive"
         } },
      ]
    }

    if (organizationId) {
      whereClause.organizationId = organizationId
    }

    if (role) {
      whereClause.role = role
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        _count: {
          select: {
            createdTasks: true,
            assignedTasks: true,
            sentMessages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(users)
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/superadmin/users
 * Super admin: Create a new user (optionally scoped to an organization)
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const data = await req.json()
    const {
      name,
      email,
      role = "EMPLOYEE",
      isSuperAdmin = false,
      organizationId,
      departmentId,
      password,
    } = data || {}

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    // Hash password or use default
    const bcrypt = require("bcryptjs")
    const hashed = await bcrypt.hash(password || "ChangeMe123!", 10)

    const created = await db.user.create({
      data: {
        name: name || null,
        email,
        password: hashed,
        role,
        isSuperAdmin,
        organizationId: organizationId || null,
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        organizationId: true,
        departmentId: true,
        createdAt: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
