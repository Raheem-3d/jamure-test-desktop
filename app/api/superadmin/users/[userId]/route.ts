import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/users/[userId]
 * Super admin: Get detailed user info
 */
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const targetUser = await db.user.findUnique({
      where: { id: params.userId },
      include: {
        organization: true,
        department: true,
        _count: {
          select: {
            createdTasks: true,
            assignedTasks: true,
            sentMessages: true,
            receivedMessages: true,
            channelMembers: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = targetUser

    return NextResponse.json(userWithoutPassword)
  } catch (error: any) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH /api/superadmin/users/[userId]
 * Super admin: Update user
 */
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const data = await req.json()

    const updatedUser = await db.user.update({
      where: { id: params.userId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        isSuperAdmin: data.isSuperAdmin,
        organizationId: data.organizationId,
        departmentId: data.departmentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        organizationId: true,
        departmentId: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/superadmin/users/[userId]
 * Super admin: Delete user
 */
export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    await db.user.delete({
      where: { id: params.userId },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
