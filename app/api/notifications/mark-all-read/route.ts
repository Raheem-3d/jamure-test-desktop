import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Update all unread notifications for the user
    await db.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
