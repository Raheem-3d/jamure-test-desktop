

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { reminderProcessor } from "@/lib/reminder-processor"
import { emitToUser } from "@/lib/socket-server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === "create-test-reminder") {
      // Create a test reminder that's due in 1 minute
      const testReminder = await db.reminder.create({
        data: {
          title: "Test Reminder",
          description: "This is a test reminder created for testing notifications",
          remindAt: new Date(Date.now() + 60000), // 1 minute from now
          priority: "HIGH",
          type: "GENERAL",
          creatorId: session.user.id,
          assigneeId: session.user.id,
        },
       
      })
        
      return NextResponse.json({
        success: true,
        message: "Test reminder created (due in 1 minute)",
        reminder: testReminder,
      })
    }

    if (action === "trigger-check") {
      await reminderProcessor.triggerManualCheck()
      return NextResponse.json({
        success: true,
        message: "Manual reminder check triggered",
      })
    }

    if (action === "get-status") {
      const status = await reminderProcessor.getProcessorStatus()
      return NextResponse.json(status)
    }

    if (action === "start-processor") {
      reminderProcessor.start(30000) // 30 seconds
      return NextResponse.json({
        success: true,
        message: "Reminder processor started",
      })
    
    }

    if (action === "stop-processor") {
      reminderProcessor.stop()
      return NextResponse.json({
        success: true,
        message: "Reminder processor stopped",
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in test reminder API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// is me se tab change rahi to neeche side se jo notificaion Aate hai.us ka code konsa hai.

