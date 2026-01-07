import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/tasks
 * Super admin: Get all tasks across all organizations
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const search = searchParams.get("search")

    let whereClause: any = {}

    if (organizationId) {
      whereClause.organizationId = organizationId
    }

    if (status) {
      whereClause.status = status
    }

    if (priority) {
      whereClause.priority = priority
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, 
          // mode: "insensitive"
         } },
        { description: { contains: search, 
          // mode: "insensitive"
         } },
      ]
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            Stage: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/superadmin/tasks
 * Super admin: Create a new task (or project if stages provided)
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const data = await req.json()
    const {
      title,
      description,
      priority = "MEDIUM",
      status = "TODO",
      deadline,
      organizationId,
      creatorId,
      assignedUserIds,
      stages,
    } = data || {}

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }

    const createdTask = await db.task.create({
      data: {
        title,
        description: description || null,
        priority,
        status,
        deadline: deadline ? new Date(deadline) : null,
        organizationId: organizationId || null,
        creatorId: creatorId || user.id,
      },
    })

    // Optional assignments
    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      await db.taskAssignment.createMany({
        data: assignedUserIds.map((uid: string) => ({ taskId: createdTask.id, userId: uid })),
        skipDuplicates: true,
      })
    }

    // Optional stages => treat as a project
    if (Array.isArray(stages) && stages.length > 0) {
      await db.stage.createMany({
        data: stages.map((s: any, idx: number) => ({
          taskId: createdTask.id,
          name: String(s?.name || `Stage ${idx + 1}`),
          color: String(s?.color || "#64748b"),
          assignedTeam: s?.assignedTeam || null,
          order: Number.isFinite(s?.order) ? s.order : idx,
        })),
      })
    }

    const task = await db.task.findUnique({
      where: { id: createdTask.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        Stage: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error: any) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
