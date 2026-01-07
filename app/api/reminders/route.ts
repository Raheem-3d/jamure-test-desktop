import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { emitToUser } from "@/lib/socket-server"

// GET - Fetch reminders for current user or all (if admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assigneeId = searchParams.get("assigneeId")
    const includeAll = searchParams.get("includeAll") === "true"

    const whereClause: any = {}

    // If user is org admin and wants to see all reminders
  if (user.role === "ORG_ADMIN" && includeAll) {
      // No filter - get all reminders
  } else if (assigneeId && user.role === "ORG_ADMIN") {
      // Org admin viewing specific user's reminders
      whereClause.assigneeId = assigneeId
    } else {
      // Regular user - only their own reminders
  whereClause.OR = [{ assigneeId: user.id }, { creatorId: user.id }]
    }

    const reminders = await db.reminder.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        remindAt: "asc",
      },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error("Error fetching reminders:", error)
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 })
  }
}

// POST - Create new reminder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, remindAt, assigneeId, priority, type } = body

    if (!title || !remindAt) {
      return NextResponse.json({ error: "Title and remind time are required" }, { status: 400 })
    }

    // Validate assignee
  const targetAssigneeId = assigneeId || user.id

    // Check if user can assign to this person
    if (targetAssigneeId !== user.id && user.role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "Only organization admins can assign reminders to other users" }, { status: 403 })
    }

    // Verify assignee exists
    const assignee = await db.user.findUnique({
      where: { id: targetAssigneeId },
    })

    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 })
    }

    const reminder = await db.reminder.create({
      data: {
        title,
        description,
        remindAt: new Date(remindAt),
        priority: priority || "MEDIUM",
        type: type || "GENERAL",
  creatorId: user.id,
        assigneeId: targetAssigneeId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

  const not=  emitToUser(targetAssigneeId,'jf',reminder)
  console.log(not,'not')

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error("Error creating reminder:", error)
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 })
  }
}
