import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

// GET /api/superadmin/tasks/[taskId] - Get task details
export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const task = await db.task.findUnique({
      where: { id: params.taskId },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        project: {
          select: { id: true, title: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            comments: true,
            assignments: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

// PATCH /api/superadmin/tasks/[taskId] - Update task
export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const body = await req.json()
    const { title, description, status, priority, deadline, projectId } = body

    const task = await db.task.update({
      where: { id: params.taskId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(projectId !== undefined && { projectId }),
      },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        project: {
          select: { id: true, title: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// DELETE /api/superadmin/tasks/[taskId] - Delete task
export async function DELETE(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    // Delete related records first
    await db.$transaction([
      // Delete task assignments
      db.taskAssignment.deleteMany({
        where: { taskId: params.taskId }
      }),
      // Delete task comments
      db.taskComment.deleteMany({
        where: { taskId: params.taskId }
      }),
      // Delete the task
      db.task.delete({
        where: { id: params.taskId }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      message: "Task deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
