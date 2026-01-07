import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Fetch specific reminder
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reminder = await db.reminder.findUnique({
      where: { id: params.id },
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

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    // Check permissions
    const canView =
      reminder.assigneeId === user.id || reminder.creatorId === user.id || user.role === "ADMIN"

    if (!canView) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(reminder)
  } catch (error) {
    console.error("Error fetching reminder:", error)
    return NextResponse.json({ error: "Failed to fetch reminder" }, { status: 500 })
  }
}

// PATCH - Update reminder
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, remindAt, isMuted, priority, type } = body

    const existingReminder = await db.reminder.findUnique({
      where: { id: params.id },
    })

    if (!existingReminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    // Check permissions
    const canEdit =
      existingReminder.assigneeId === user.id ||
      existingReminder.creatorId === user.id ||
      user.role === "ADMIN"

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (remindAt !== undefined) updateData.remindAt = new Date(remindAt)
    if (isMuted !== undefined) updateData.isMuted = isMuted
    if (priority !== undefined) updateData.priority = priority
    if (type !== undefined) updateData.type = type

    const updatedReminder = await db.reminder.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedReminder)
  } catch (error) {
    console.error("Error updating reminder:", error)
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 })
  }
}

// DELETE - Delete reminder
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingReminder = await db.reminder.findUnique({
      where: { id: params.id },
    })

    if (!existingReminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    // Check permissions  r

  const canDelete = existingReminder.creatorId === user.id || user.role === "ADMIN"

    if (!canDelete) {
      return NextResponse.json({ error: "Only creators and admins can delete reminders" }, { status: 403 })
    }

    await db.reminder.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting reminder:", error)
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 })
  }
}
