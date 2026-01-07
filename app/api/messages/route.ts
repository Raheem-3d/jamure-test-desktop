


import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { emitToUser, emitToChannel, getSocketIO } from "@/lib/socket-server"




export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const currentUser = await getSessionOrMobileUser(req as any)
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      content,
      channelId,
      receiverId,
      fileUrl,      // legacy single
      fileName,
      fileType,
      files,        // client se aayega
      clientId,
      pinnedMessageId,
    } = body

    const hasContent = typeof content === "string" && content.trim().length > 0
    const hasSingleFile = Boolean(fileUrl)
    const hasFilesArray = Array.isArray(files) && files.length > 0

    if (!hasContent && !hasSingleFile && !hasFilesArray) {
      return NextResponse.json({ message: "Content or file is required" }, { status: 400 })
    }
    if (!channelId && !receiverId) {
      return NextResponse.json({ message: "Either channelId or receiverId must be provided" }, { status: 400 })
    }

    const normalizedFiles = hasFilesArray
      ? files
          .filter((f: any) => f?.fileUrl)
          .map((f: any) => ({
            fileUrl: String(f.fileUrl),
            fileName: f.fileName ? String(f.fileName) : null,
            fileType: f.fileType ? String(f.fileType) : null,
          }))
      : undefined

    const message = await db.message.create({
      data: {
        content: hasContent ? content.trim() : "",
        senderId: currentUser.id,
        channelId: channelId || null,
        receiverId: receiverId || null,

        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,

        attachments: normalizedFiles ? (normalizedFiles as any) : undefined,
        pinnedMessageId: pinnedMessageId || null,

        // ✅ reactions ko seed karo (refresh-safe)
        reactions: [] as any,
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        channelId: true,
        createdAt: true,
        updatedAt: true,
        isPinned: true,
        attachments: true,
        fileUrl: true,
        fileName: true,
        fileType: true,

        // ✅ MAIN message reactions (JSON)
        reactions: true,

        sender: { select: { id: true, name: true, email: true, image: true } },
        receiver: { select: { id: true, name: true, email: true, image: true } },
        pinnedMessageId: true,
        pinnedMessage: {
          select: { id: true, content: true, sender: { select: { name: true } } },
        },
      },
    })

    const enriched = {
      ...message,
      clientId: clientId || null,
      pinnedAuthor: message.pinnedMessage?.sender?.name ?? null,
      pinnedPreview: message.pinnedMessage?.content?.slice(0, 160) ?? null,
    }



      // Emit message via Socket.io (enriched)
      let messageEmitted = false
      if (enriched.channelId) {
        messageEmitted = emitToChannel(enriched.channelId, "new-message", enriched)
      } else if (enriched.receiverId) {
        messageEmitted = emitToUser(enriched.receiverId, "new-message", enriched)
      }

      // Notify the sender that the server has accepted the message ('sent')
      try {
          emitToUser(currentUser.id, "message:status-updated", {
          messageId: enriched.id,
          status: "sent",
        })

        // If recipient is online (has sockets), also notify sender that message was delivered
        if (enriched.receiverId) {
          const io = getSocketIO()
          const room = io?.sockets?.adapter?.rooms?.get(`user-${enriched.receiverId}` as any)
          if (room && room.size > 0) {
            emitToUser(currentUser.id, "message:status-updated", {
              messageId: enriched.id,
              status: "delivered",
            })
          }
        }
      } catch (e) {
        // non-fatal
        console.error("Failed to emit status update", e)
      }

    // Direct message notification - Fixed: messageId should be the actual message ID
    if (receiverId && receiverId !== currentUser.id) {
      const notification = await db.notification.create({
        data: {
          type: "DIRECT_MESSAGE",
          content: `New message from ${currentUser.name}: ${
            content ? content.substring(0, 50) + (content.length > 50 ? "..." : "") : "Sent a file"
          }`,
          userId: receiverId,
          messageId: message.id,
          channelId: channelId || null,
          read: false,
        },
      })
        const enrichedNotification = {
          ...notification,
          senderId: currentUser.id,
          receiverId: receiverId,
        } as any
        emitToUser(receiverId, "new-notification", enrichedNotification)
    }

    if (channelId) {
      const channelMembers = await db.channelMember.findMany({
        where: { channelId, userId: { not: currentUser.id } },
        include: { user: true },
      })
      const channel = await db.channel.findUnique({ where: { id: channelId }, select: { name: true } })

      for (const member of channelMembers) {
        const notification = await db.notification.create({
          data: {
            type: "CHANNEL_MESSAGE",
            content: `New message in #${channel?.name || "channel"} from ${currentUser.name}: ${
              content ? content.substring(0, 50) + (content.length > 50 ? "..." : "") : "Sent a file"
            }`,
            userId: member.userId,
            messageId: message.id,  // ✅ Added: Link notification to message for proper deletion tracking
            channelId: channelId,
            read: false,
          },
        })
        emitToUser(member.userId, "new-notification", notification)
      }
    }
    return NextResponse.json(enriched, { status: 201 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
