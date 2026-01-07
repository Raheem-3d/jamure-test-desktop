import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTenantWhereClause } from "@/lib/org"

export async function GET(req: Request) {
  try {
    // Support both web sessions and mobile Authorization JWTs
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    
    // Apply tenant isolation - super admins can see all users
    // Regular users only see users from their organization
    const whereClause = await getTenantWhereClause({
      id: { not: user.id }, // Exclude current user
    }, req as any)

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        organizationId: true,
        department: {
          select: {
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
