// app/api/mentionables/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db" // <- aapka Prisma client

export async function GET(req: NextRequest) {
  const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
  const user: any = await getSessionOrMobileUser(req as any)
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const channelId = searchParams.get("channelId")
  const receiverId = searchParams.get("receiverId")




  try {
    // If channelId -> return channel members as mentionables
    if (channelId) {
      const members = await db.channelMember.findMany({
        where: { channelId },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      })

      const mentionables = members
        .map((m: any) => ({
          id: m.user.id,
          name: m.user.name ?? "Member",
          type: "user" as const,
          avatarUrl: m.user.image ?? null,
        }))
        .filter((m: any) => m.id !== user.id)


      console.log('mentionables from channel', mentionables)

      return NextResponse.json({ mentionables })
    }

    // If direct chat (receiverId) -> return that single user
    if (receiverId) {
      const user = await db.user.findUnique({
        where: { id: receiverId },
        select: { id: true, name: true, image: true },
      })

      const mentionables = user
        ? [{
            id: user.id,
            name: user.name ?? "User",
            type: "user" as const,
            avatarUrl: user.image ?? null,
          }]
        : []

      return NextResponse.json({ mentionables })
    }

    return NextResponse.json({ mentionables: [] })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to load mentionables" }, { status: 500 })
  }
}
