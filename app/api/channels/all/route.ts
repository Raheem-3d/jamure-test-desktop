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

    // Get all channels with member and message counts
    const channels = await db.channel.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        isDepartment: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: [{ isDepartment: "desc" }, { isPublic: "desc" }, { name: "asc" }],
    })

    return NextResponse.json(channels)
  } catch (error) {
    console.error("Error fetching channels:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
