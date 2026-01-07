import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"


export async function GET(request: NextRequest) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const currentUser = await getSessionOrMobileUser(request as any)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Pagination params
    const limitParam = searchParams.get("limit")
    const beforeParam = searchParams.get("before")
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 0)) : undefined

    const currentUserId = currentUser.id
    const where: any = {
      OR: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
      channelId: null,
    }

    if (beforeParam) {
      // Expecting ISO timestamp
      const beforeDate = new Date(beforeParam)
      if (!isNaN(beforeDate.getTime())) {
        where.createdAt = { lt: beforeDate }
      }
    }

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ?? undefined,
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
        seenBy: true,
        reactions: true,
        sender: { select: { id: true, name: true, email: true, image: true } },
        pinnedMessageId: true,
        pinnedMessage: {
          select: {
            id: true,
            content: true,
            reactions: true,
            sender: { select: { name: true } },
          },
        },
      },
    })

    const enriched = messages.map((m: any) => ({
      ...m,
       reactions: Array.isArray(m.reactions) ? m.reactions : [], 
      pinnedAuthor: m.pinnedMessage?.sender?.name ?? null,
      pinnedPreview: m.pinnedMessage?.content?.slice(0, 160) ?? null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching direct messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
