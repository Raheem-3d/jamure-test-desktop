import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  const orgId = session?.user?.organizationId
  const anns = await db.announcement.findMany({
    where: { OR: [{ scope: "GLOBAL" }, { organizationId: orgId }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ announcements: anns })
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  const role = session?.user?.role
  if (!hasPermission(role, "ORG_EDIT")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const orgId = session?.user?.organizationId
  const { title, message } = await req.json()
  const created = await db.announcement.create({ data: { title, message, scope: orgId ? "ORG" : "GLOBAL", organizationId: orgId || null } as any })
  return NextResponse.json({ announcement: created })
}
