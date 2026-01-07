import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

/**
 * GET /api/superadmin/channels
 * Super admin: Get all channels across all organizations
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId")
    const search = searchParams.get("search")

    let whereClause: any = {}

    if (organizationId) {
      whereClause.organizationId = organizationId
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search,
          //  mode: "insensitive"
           } },
        { description: { contains: search, 
          // mode: "insensitive" 
        } },
      ]
    }

    const channels = await db.channel.findMany({
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
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Attach isPrivate for UI compatibility
    const withPrivacy = channels.map((c: any) => ({ ...c, isPrivate: !c.isPublic }))
    return NextResponse.json(withPrivacy)
  } catch (error: any) {
    console.error("Error fetching channels:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/superadmin/channels
 * Super admin: Create a new channel
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const data = await req.json()
    const {
      name,
      description,
      isPrivate = false,
      organizationId,
      creatorId,
      memberIds,
      type = "GENERAL",
      departmentId,
    } = data || {}

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    const created = await db.channel.create({
      data: {
        name,
        description: description || null,
        isPublic: !isPrivate,
        isDepartment: !!departmentId,
        organizationId: organizationId || null,
        creatorId: creatorId || user.id,
        type,
        departmentId: departmentId || null,
      },
    })

    // Optional initial members (including creator)
    const members = Array.isArray(memberIds) ? memberIds : []
    if (!members.includes(creatorId || user.id)) members.push(creatorId || user.id)
    if (members.length > 0) {
      await db.channelMember.createMany({
        data: members.map((uid: string) => ({ channelId: created.id, userId: uid })),
        skipDuplicates: true,
      })
    }

    const channel = await db.channel.findUnique({
      where: { id: created.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        _count: { select: { members: true, messages: true } },
      },
    })

    return NextResponse.json(channel, { status: 201 })
  } catch (error: any) {
    console.error("Error creating channel:", error)
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: error.status || 500 }
    )
  }
}
