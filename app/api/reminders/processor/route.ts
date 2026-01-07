import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { reminderProcessor } from "@/lib/reminder-processor"

// GET - Get processor status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "Organization admin access required" }, { status: 403 })
    }

    const status = await reminderProcessor.getProcessorStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error getting processor status:", error)
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

// POST - Control processor (start/stop)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "Organization admin access required" }, { status: 403 })
    }

    const { action, intervalMs } = await request.json()

    if (action === "start") {
      reminderProcessor.start(intervalMs || 60000)
      return NextResponse.json({ success: true, message: "Processor started" })
    } else if (action === "stop") {
       reminderProcessor.start(intervalMs || 60000)
      return NextResponse.json({ success: true, message: "Processor stopped" })
    } else if (action === "process") {
      // Manual trigger
      await reminderProcessor.processDueReminders()
      return NextResponse.json({ success: true, message: "Manual processing completed" })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error controlling processor:", error)
    return NextResponse.json({ error: "Failed to control processor" }, { status: 500 })
  }
}
