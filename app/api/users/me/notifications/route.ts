


import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any).user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = await db.userNotificationPreference.findUnique({
      where: {
        userId: user.id,
      },
    })

    if (!preferences) {
      // Return default preferences
      return NextResponse.json({
        email: true,
        push: true,
        sms: false,
      })
    }

    return NextResponse.json({
      email: preferences.emailNotifications,
      push: preferences.pushNotifications,
      sms: preferences.smsNotifications,
    })
  } catch (error) {
    console.error("Error fetching notification preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any).user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, push, sms } = await request.json()

    await db.userNotificationPreference.upsert({
      where: { userId: user.id },
      update: {
        emailNotifications: email,
        pushNotifications: push,
        smsNotifications: sms,
      },
      create: {
        userId: user.id,
        emailNotifications: email,
        pushNotifications: push,
        smsNotifications: sms,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving notification preferences:", error)
    return NextResponse.json(
      { error: "Failed to save preferences" },
    )
  }
}
