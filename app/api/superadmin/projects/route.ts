import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/projects
 * Super admin: Get all projects (tasks with stages) across all organizations
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId")
    const status = searchParams.get("status")

    let whereClause: any = {
      Stage: {
        some: {}, // Only tasks that have stages (projects)
      },
    }

    if (organizationId) {
      whereClause.organizationId = organizationId
    }

    if (status) {
      whereClause.status = status
    }

    const projects = await db.task.findMany({
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
        Stage: {
          include: {
            _count: {
              select: {
                Record: true,
              },
            },
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(projects)
  } catch (error: any) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/superadmin/projects
 * Super admin: Create a new project (task with stages)
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
      status = "IN_PROGRESS",
      deadline,
      organizationId,
      creatorId,
      assignedUserIds,
      stages = [],
    } = data || {}

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }

    // Create base task representing the project
    const created = await db.task.create({
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

    // Assign users
    if (Array.isArray(assignedUserIds) && assignedUserIds.length) {
      await db.taskAssignment.createMany({
        data: assignedUserIds.map((uid: string) => ({ taskId: created.id, userId: uid })),
        skipDuplicates: true,
      })
    }

    // Create stages
    if (Array.isArray(stages) && stages.length) {
      await db.stage.createMany({
        data: stages.map((s: any, idx: number) => ({
          taskId: created.id,
            name: String(s?.name || `Stage ${idx + 1}`),
            color: String(s?.color || "#3b82f6"),
            assignedTeam: s?.assignedTeam || null,
            order: Number.isFinite(s?.order) ? s.order : idx,
        })),
      })
    }

    const project = await db.task.findUnique({
      where: { id: created.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        Stage: true,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error: any) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
