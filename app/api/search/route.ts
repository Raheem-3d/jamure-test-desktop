import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
  const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

  const user: any = (session as any).user || {}
  const orgId = user.organizationId
    if (!orgId) {
      return NextResponse.json({ message: "Organization context missing" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")

    console.log(query,'query')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ message: "Search query too short" }, { status: 400 })
    }

    // Search messages
  const messages = await db.message.findMany({
      where: {
        organizationId: orgId,
        content: {
          contains: query.toLowerCase(),
        },
        OR: [
          {
            channelId: { not: null },
            channel: {
              organizationId: orgId,
              members: { some: { userId: user.id } },
            },
          },
          { senderId: user.id },
          { receiverId: user.id },
        ],
      },
      include: { sender: true, channel: true },
      take: 5,
    })

    // Search tasks
    const tasks = await db.task.findMany({
      where: {
        organizationId: orgId,
        AND: [
          {
            OR: [
              { title: { contains: query,
                //  mode: "insensitive" 
                } },
              { description: { contains: query, 
              //  mode: "insensitive" 
              } },
            ],
          },
          {
            OR: [
              { creatorId: user.id },
              { assignments: { some: { userId: user.id } } },
            ],
          },
        ],
      },
      include: { creator: true },
      take: 5,
    })

    // Search channels
    const channels = await db.channel.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query.toLowerCase() } },
          { description: { contains: query.toLowerCase() } },
        ],
  members: { some: { userId: user.id } },
      },
      take: 5,
    })

    // Search users
    const users = await db.user.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query.toLowerCase() } },
          { email: { contains: query.toLowerCase() } },
        ],
  id: { not: user.id },
      },
      take: 5,
    })

    // Format and combine results
  const formattedMessages = messages.map((message: any) => ({
      ...message,
      type: "message",
    }))

  const formattedTasks = tasks.map((task: any) => ({
      ...task,
      type: "task",
    }))

  const formattedChannels = channels.map((channel: any) => ({
      ...channel,
      type: "channel",
    }))

    const formattedUsers = users.map((u: any) => ({
      ...u,
      type: "user",
    }))

    const results = [...formattedMessages, ...formattedTasks, ...formattedChannels, ...formattedUsers]

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error searching:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
