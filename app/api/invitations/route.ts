import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

   
    const { email, name, role, departmentId } = await req.json()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 })
    }

    // Create invitation
    const invitation = await db.user.create({
      data: {
        email,
        name,
        role,
        departmentId,
        inviterId: session.user.id,
        token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        inviter: true,
        department: true,
      },
    })

    // TODO: Send invitation email

    return NextResponse.json(invitation)
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    // Only admins and managers can view all invitations
    if (!currentUser || (currentUser.role !== "ORG_ADMIN" && currentUser.role !== "MANAGER")) {
      // For regular users, only show invitations they sent
      const invitations = await db.invitation.findMany({
        where: {
          inviterId: session.user.id,
        },
        include: {
          inviter: true,
          department: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return NextResponse.json(invitations)
    }

    // For admins and managers, show all invitations
    const invitations = await db.invitation.findMany({
      include: {
        inviter: true,
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}










