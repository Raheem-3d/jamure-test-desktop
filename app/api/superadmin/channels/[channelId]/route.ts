import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

// GET /api/superadmin/channels/[channelId] - Get channel details
export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const channel = await db.channel.findUnique({
      where: { id: params.channelId },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, role: true }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    if (channel) {
      return NextResponse.json({ ...channel, isPrivate: !channel.isPublic })
    }
    return NextResponse.json(channel)
  } catch (error) {
    console.error("Error fetching channel:", error)
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 }
    )
  }
}

// PATCH /api/superadmin/channels/[channelId] - Update channel
export async function PATCH(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const body = await req.json()
  const { name, description, isPrivate } = body

    const channel = await db.channel.update({
      where: { id: params.channelId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPrivate !== undefined && { isPublic: !isPrivate }),
      },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    })

  return NextResponse.json({ ...channel, isPrivate: !channel.isPublic })
  } catch (error) {
    console.error("Error updating channel:", error)
    return NextResponse.json(
      { error: "Failed to update channel" },
      { status: 500 }
    )
  }
}

// DELETE /api/superadmin/channels/[channelId] - Delete channel
export async function DELETE(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    // Delete related records first
    await db.$transaction([
      // Delete notifications related to channel messages
      db.notification.deleteMany({
        where: { channelId: params.channelId }
      }),
      // Delete channel members
      db.channelMember.deleteMany({
        where: { channelId: params.channelId }
      }),
      // Delete channel messages
      db.message.deleteMany({
        where: { channelId: params.channelId }
      }),
      // Delete the channel
      db.channel.delete({
        where: { id: params.channelId }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      message: "Channel deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting channel:", error)
    return NextResponse.json(
      { error: "Failed to delete channel" },
      { status: 500 }
    )
  }
}
