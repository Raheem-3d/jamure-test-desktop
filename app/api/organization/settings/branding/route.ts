import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { assertOrgAccess } from "@/lib/org"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  const role = session?.user?.role
  if (!hasPermission(role, "ORG_EDIT")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const organizationId = await assertOrgAccess()
  const { logoUrl, themeColor } = await req.json()
  const updated = await db.organization.update({
    where: { id: organizationId },
    data: { logoUrl, themeColor },
  })
  return NextResponse.json({ organization: updated })
}
