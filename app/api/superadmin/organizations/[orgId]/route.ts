import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/organizations/[orgId]
 * Super admin: Get detailed organization info
 */
export async function GET(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const organization = await db.organization.findUnique({
      where: { id: params.orgId },
      include: {
        subscription: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            Channel: true,
            Task: true,
            Message: true,
            activityLogs: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(organization)
  } catch (error: any) {
    console.error("Error fetching organization:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH /api/superadmin/organizations/[orgId]
 * Super admin: Update organization
 */
export async function PATCH(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const data = await req.json()

    const organization = await db.organization.update({
      where: { id: params.orgId },
      data: {
        name: data.name,
        industry: data.industry,
        primaryEmail: data.primaryEmail,
        phone: data.phone,
        address: data.address,
        suspended: data.suspended,
        trialStatus: data.trialStatus,
      },
    })

    return NextResponse.json(organization)
  } catch (error: any) {
    console.error("Error updating organization:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/superadmin/organizations/[orgId]
 * Super admin: Delete organization (cascade deletes all related data)
 */
export async function DELETE(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    // Delete organization (will cascade)
    await db.organization.delete({
      where: { id: params.orgId },
    })

    return NextResponse.json({ message: "Organization deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting organization:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
