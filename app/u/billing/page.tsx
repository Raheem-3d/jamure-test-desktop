import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import SubscriptionBanner from "@/components/subscription-banner"
import { RazorpayButton } from "@/components/razorpay-button"

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  const user: any = (session as any)?.user || {}
  if (!user.id) return null

  const orgId = user.organizationId || null
  const sub = orgId ? await db.subscription.findUnique({ where: { organizationId: orgId } }) : null

  // During trial: show only trial banner, hide purchase box (to reduce friction) 
  const isTrial = sub?.status === "TRIAL"

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <SubscriptionBanner />

      {!isTrial && (
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Plan</h2>
          <p className="text-sm text-gray-600 mb-4">JamureChat Pro — annual license</p>
          <RazorpayButton label={sub?.status === "ACTIVE" ? "Renew" : "Buy now"} />
        </div>
      )}
    </div>
  )
}

