import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDaysLeft, getNextReminderUtc, IST_TZ } from "@/lib/subscription-utils"
import { RazorpayButton } from "./razorpay-button"

function formatIst(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: IST_TZ,
  }).format(date)
}

export default async function SubscriptionBanner() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.id) return null

  // Organization-level subscription
  const orgId = session.user.organizationId || null
  const sub = orgId ? await db.subscription.findUnique({ where: { organizationId: orgId } }) : null
  if (!sub) return null

  const now = new Date()

  if (sub.status === "TRIAL") {
    const daysLeft = getDaysLeft(sub.trialEnd, now)
    const nextRem = getNextReminderUtc(sub.trialEnd, now)
    return (
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold">You're on a free trial</p>
            <p className="text-sm">Org trial days left: <b>{daysLeft}</b> • Ends on {formatIst(sub.trialEnd)}</p>
            {/* {nextRem && <p className="text-xs text-amber-700">Next reminder: {formatIst(nextRem)}</p>} */}
          </div>
          {/* Hide purchase button during trial */}
        </div>
      </div>
    )
  }

  if (sub.status === "EXPIRED") {
    return (
      <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold">Your trial has expired</p>
            <p className="text-sm">Renew to continue using all features.</p>
          </div>
          <RazorpayButton label="Renew now" />
        </div>
      </div>
    )
  }

  if (sub.status === "ACTIVE") {
    return (
      <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <p className="font-semibold">Subscription active</p>
        {sub.currentPeriodEnd && (
          <p className="text-sm">Valid until {formatIst(new Date(sub.currentPeriodEnd))}</p>
        )}
      </div>
    )
  }

  return null
}

