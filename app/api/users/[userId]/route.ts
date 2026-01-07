import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { channel } from "diagnostics_channel"

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Fetch user basic info for notifications/buzz display
    const user = await db.user.findUnique({
      where: {
        id: params.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        organizationId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Optional: enforce same organization check
    const currentUser = await db.user.findUnique({
      where: { id: (session as any).user?.id || "" },
      select: { organizationId: true },
    })

    if (currentUser?.organizationId && user.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is organization admin
    const currentUser = await db.user.findUnique({
      where: {
        id: (session as any).user?.id || "",
      },
      select: {
        role: true,
        organizationId: true,
      },
    })

    if (currentUser?.role !== "ORG_ADMIN") {
      return NextResponse.json({ message: "Only organization admins can update users" }, { status: 403 })
    }

    const { role, departmentId, online } = await req.json()

    // Enforce organization scoping: target user must be in same organization
    const target = await db.user.findUnique({ where: { id: params.userId }, select: { organizationId: true } })
    if (!target || (currentUser.organizationId && target.organizationId !== currentUser.organizationId)) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Update user
    const user = await db.user.update({
      where: {
        id: params.userId,
      },
      data: {
        ...(role && { role }),
        ...(departmentId && { departmentId }),
        ...(online && { online }),
      },
      include: {
        department: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

