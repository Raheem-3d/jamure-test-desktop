

import { reminderProcessor } from "./reminder-processor"
import { subscriptionScheduler } from "./subscription-scheduler"

let isInitialized = false

export function initializeReminderSystem() {
  if (isInitialized) {
    console.log("⏳ Reminder system already initialized")
    return
  }

  console.log("🚀 Initializing Reminder System...")

  reminderProcessor.start(30000) // 30 seconds
  // Start subscription scheduler (5 minutes)
  subscriptionScheduler.start(5 * 60 * 1000)

  isInitialized = true
  console.log("✅ Reminder system initialized successfully")
}

// Auto-run on server
if (typeof window === "undefined") {
  setTimeout(() => {
    initializeReminderSystem()
  }, 1000)
}
