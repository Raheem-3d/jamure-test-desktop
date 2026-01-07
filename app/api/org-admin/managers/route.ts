import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkOrgAdmin } from "@/lib/permissions"

// GET /api/org-admin/managers - list managers in caller's organization
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkOrgAdmin(user.role)
    
    if (!user.organizationId) {
      return NextResponse.json({ managers: [] }, { status: 200 })
    }

    const managers = await db.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: "MANAGER"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ managers })
  } catch (error: any) {
    console.error('Org-admin managers list error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}
