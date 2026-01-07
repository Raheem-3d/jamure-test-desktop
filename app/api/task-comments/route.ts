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

  const { content, taskId } = await req.json()
  const orgId = (session as any).user?.organizationId

    // Check if task exists
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        assignments: true,
        creator: true,
      },
    })

    if (!task || (orgId && (task as any).organizationId && (task as any).organizationId !== orgId)) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    // Check if user is authorized to comment on this task
  const user: any = (session as any).user || {}
  const isCreator = task.creatorId === user.id
  const isAssignee = task.assignments.some((assignment: any) => assignment.userId === user.id)

    if (!isCreator && !isAssignee) {
      return NextResponse.json({ message: "You are not authorized to comment on this task" }, { status: 403 })
    }

    // Create comment
    const comment = await db.taskComment.create({
      data: {
        content,
        taskId,
        userId: user.id,
      },
      include: {
        user: true,
      },
    })

    // Socket.io will handle real-time updates from the client side
    // No need to trigger Pusher events here

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error adding comment:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
