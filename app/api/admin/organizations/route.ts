import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/org"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const orgs = await db.organization.findMany({
    include: { subscription: true, _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ organizations: orgs })
}

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const { organizationId, suspended } = await req.json()
  if (!organizationId) return NextResponse.json({ message: "organizationId required" }, { status: 400 })
  const updated = await db.organization.update({
    where: { id: organizationId },
    data: { suspended: !!suspended },
  })
  return NextResponse.json({ organization: updated })
}
