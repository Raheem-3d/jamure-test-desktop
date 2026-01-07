import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Only assignee can mute/unmute their own reminders
    if (existingReminder.assigneeId !== user.id) {
      return NextResponse.json({ error: "Only assignees can mute/unmute reminders" }, { status: 403 })
    }

    const updatedReminder = await db.reminder.update({
      where: { id: params.id },
      data: {
        isMuted: !existingReminder.isMuted,
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

    return NextResponse.json({
      success: true,
      reminder: updatedReminder,
      action: updatedReminder.isMuted ? "muted" : "unmuted",
    })
  } catch (error) {
    console.error("Error toggling mute:", error)
    return NextResponse.json({ error: "Failed to toggle mute" }, { status: 500 })
  }
}
