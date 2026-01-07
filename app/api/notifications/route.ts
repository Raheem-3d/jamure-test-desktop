import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const rows = await db.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    })

    const messageIds = rows
      .map((n: any) => n.messageId)
      .filter((id: any) => Boolean(id))

    let messagesById: Record<string, { senderId: string | null; receiverId: string | null }> = {}
    if (messageIds.length > 0) {
      const msgs = await db.message.findMany({
        where: { id: { in: messageIds as string[] } },
        select: { id: true, senderId: true, receiverId: true },
      })
      messagesById = msgs.reduce((acc: any, m: any) => {
        acc[m.id] = { senderId: m.senderId ?? null, receiverId: m.receiverId ?? null }
        return acc
      }, {})
    }

    const notifications = rows.map((n: any) => ({
      ...n,
      senderId: n.messageId ? messagesById[n.messageId]?.senderId ?? null : null,
      receiverId: n.messageId ? messagesById[n.messageId]?.receiverId ?? null : null,
    }))

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id, read } = await req.json()

    const notification = await db.notification.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        read,
      },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}



export async function DELETE(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await req.json()

    // Delete only if the notification belongs to the logged-in user
    const deletedNotification = await db.notification.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    })

    if (deletedNotification.count === 0) {
      return NextResponse.json(
        { message: "Notification not found or not authorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}