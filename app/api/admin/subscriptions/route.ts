import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.id || session.user.role !== "ORG_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const subs = await db.subscription.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ subs })
}
