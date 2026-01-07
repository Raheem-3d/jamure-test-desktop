

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
// import { prisma } from "@/lib/prisma" // Make sure this is set up properly

export async function GET(request: NextRequest,{ params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.taskId

    const muteSettings = await db.taskMuteSetting.findMany({
      where: { taskId },
    })

    return NextResponse.json(
      muteSettings.map((setting) => ({
        userId: setting.userId,
        taskId: setting.taskId,
        isMuted: setting.isMuted,
      }))
    )
  } catch (error) {
    console.error("Error fetching mute settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch mute settings" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.taskId
    const { userId, isMuted } = await request.json()

    if (!userId || typeof isMuted !== "boolean") {
      return NextResponse.json(
        { error: "User ID and mute status are required" },
        { status: 400 }
      )
    }

    // Upsert mute setting
    await db.taskMuteSetting.upsert({
      where: {
        taskId_userId: { taskId, userId },
      },
      update: {
        isMuted,
      },
      create: {
        taskId,
        userId,
        isMuted,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating mute settings:", error)
    return NextResponse.json(
      { error: "Failed to update mute settings" },
      { status: 500 }
    )
  }
}
