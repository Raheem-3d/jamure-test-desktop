import { db } from "@/lib/db"
import { getIstNowUtc, getReminderScheduleUtc } from "@/lib/subscription-utils"
import { sendEmail } from "@/lib/email"

class SubscriptionScheduler {
  private static instance: SubscriptionScheduler
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  static getInstance() {
    if (!SubscriptionScheduler.instance) {
      SubscriptionScheduler.instance = new SubscriptionScheduler()
    }
    return SubscriptionScheduler.instance
  }

  start(intervalMs = 5 * 60 * 1000) {
    if (this.isRunning) return
    this.isRunning = true

    // run immediately then on interval
    this.tick()
    this.intervalId = setInterval(() => this.tick(), intervalMs)
    console.log(`✅ Subscription scheduler started. Interval: ${intervalMs / 1000}s`)
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = null
    this.isRunning = false
    console.log("🛑 Subscription scheduler stopped")
  }

  private async tick() {
    const nowUtc = getIstNowUtc()
    try {
      // Handle reminders for users in TRIAL
      const trials = await db.subscription.findMany({
        where: { status: "TRIAL" },
        include: { organization: { include: { users: true } } },
      })

        for (const sub of trials) {
          const schedule = getReminderScheduleUtc(sub.trialEnd)
          // Choose an org admin user (fallback: first user) to send trial emails to
          const adminUser = sub.organization?.users.find((u: any) => u.role === "ORG_ADMIN") || sub.organization?.users[0]
          if (!adminUser) continue
        // For each scheduled time, if it's due and not logged, send email and log
        for (const scheduledFor of schedule) {
          if (scheduledFor.getTime() > nowUtc.getTime()) continue

          const existing = await db.emailLog.findFirst({
            where: {
              userId: adminUser.id,
              type: "TRIAL_REMINDER",
              scheduledFor,
            },
          })
          if (existing?.sentAt) continue

          const remainingMs = sub.trialEnd.getTime() - nowUtc.getTime()
          const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))

          const subject = remainingDays > 0
            ? `Your organization trial ends in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`
            : `Your organization trial has ended`

          const html = `
            <div style="font-family: Arial, sans-serif;">
              <h2>JamureChat Organization Trial ${remainingDays > 0 ? "Reminder" : "Ended"}</h2>
              <p>Hi ${adminUser.name || "there"},</p>
              ${remainingDays > 0
                ? `<p>Your organization's 14-day trial will end in <b>${remainingDays} day${remainingDays === 1 ? "" : "s"}</b>.</p>`
                : `<p>Your organization's free trial has <b>expired</b>.`}
              <p>Please renew to continue using all features.</p>
              <p><a href="${process.env.APP_BASE_URL || "http://localhost:3000"}/dashboard" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Renew / Pay</a></p>
            </div>
          `

          await sendEmail({
            to: adminUser.email,
            subject,
            html,
            logType: remainingDays > 0 ? "TRIAL_REMINDER" : "TRIAL_EXPIRED",
            userId: adminUser.id,
            subscriptionId: sub.id,
            scheduledFor,
            metadata: { trialEnd: sub.trialEnd.toISOString(), organizationId: sub.organizationId },
          })
        }

        // If trial ended, mark as EXPIRED
        if (sub.trialEnd.getTime() <= nowUtc.getTime() && sub.status === "TRIAL") {
          await db.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED" },
          })
        }
      }
    } catch (err) {
      console.error("Subscription scheduler error:", err)
    }
  }
}

export const subscriptionScheduler = SubscriptionScheduler.getInstance()
