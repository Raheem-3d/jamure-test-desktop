import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"

// GET /api/users/my-team - list users assigned to current manager
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    
    if (!user.organizationId) {
      return NextResponse.json({ users: [] }, { status: 200 })
    }

    // If user is a manager, get their subordinates
    // If user is ORG_ADMIN, get all users in organization
    // Otherwise return empty list
    let where: any = { organizationId: user.organizationId }

    if (user.role === "MANAGER") {
      where.managerId = user.id
    } else if (user.role === "ORG_ADMIN" || user.isSuperAdmin) {
      // Admin can see all users
    } else {
      // Regular employees can't access this
      return NextResponse.json({ users: [] }, { status: 200 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        managerId: true,
        departmentId: true,
        createdAt: true,
        _count: {
          select: {
            assignedTasks: true,
            sentMessages: true,
          },
        },
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Get my team error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}
