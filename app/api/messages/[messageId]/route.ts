import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { existsSync, readFileSync } from "fs"
import { emitToUser, emitToChannel } from "@/lib/socket-server"

export async function PATCH(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messageId = params.messageId
    const { content } = await request.json()

    // Check if message exists and belongs to the user
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, receiverId: true, channelId: true },
    })

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (message.senderId !== user.id) {
      return NextResponse.json({ error: "Not authorized to edit this message" }, { status: 403 })
    }

    // Update message
    const updatedMessage = await db.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Broadcast edit to all relevant users in real-time
    const editPayload = { messageId, content }
    if (message.channelId) {
      emitToChannel(message.channelId, "message:edited", editPayload)
    } else if (message.receiverId) {
      emitToUser(message.receiverId, "message:edited", editPayload)
      emitToUser(message.senderId, "message:edited", editPayload)
    }

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error("Error updating message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


export async function DELETE(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messageId = params.messageId

    // Verify message + ownership
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, receiverId: true, channelId: true },
    })
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }
    if (message.senderId !== user.id) {
      return NextResponse.json({ error: "Not authorized to delete this message" }, { status: 403 })
    }

    // 🔑 Delete notifications for this message (all users), then delete message
    const [notifResult, deletedMsg] = await db.$transaction([
      db.notification.deleteMany({
        where: { messageId }, // <- userId filter hata diya so sab related notifs delete ho jayen
      }),
      db.message.delete({
        where: { id: messageId },
      }),
    ])

    // Broadcast deletion to all relevant users in real-time
    if (message.channelId) {
      // For channel messages, notify all channel members
      emitToChannel(message.channelId, "message:deleted", { messageId })
    } else if (message.receiverId) {
      // For direct messages, notify both sender and receiver
      emitToUser(message.senderId, "message:deleted", { messageId })
      emitToUser(message.receiverId, "message:deleted", { messageId })
    }

    // Also emit to sender (for multi-device sync)
    if (message.senderId !== user.id) {
      emitToUser(message.senderId, "message:deleted", { messageId })
    }

    return NextResponse.json({ success: true, deletedNotifications: notifResult.count })
  } catch (error) {
    console.error("Error deleting message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const fileRecord = await db.file.findUnique({
      where: { id: params.fileId },
    })

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if file exists on disk
    if (!existsSync(fileRecord.filePath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    // Read file from disk
  const fileBuffer = readFileSync(fileRecord.filePath)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileRecord.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileRecord.originalName}"`,
        "Content-Length": fileRecord.fileSize.toString(),
      },
    })
  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}

