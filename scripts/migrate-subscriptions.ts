/*
  Migration Script: Convert user-based subscriptions to organization-based subscriptions.
  Usage (after building environment):
    npx ts-node scripts/migrate-subscriptions.ts
  OR add an npm script and run: pnpm migrate:subs

  Steps:
    1. For each user subscription lacking organization subscription (user.organizationId exists)
       - Create organization subscription if missing.
       - Merge trial window: earliest trialStart, latest trialEnd, propagate ACTIVE status if any user sub is ACTIVE.
    2. Re-link payments/email logs from user subscription to organization subscription.
    3. (Optional) Delete old user subscriptions or mark them archived.
*/
import { db } from "@/lib/db"

async function run() {
  console.log("Starting subscription migration...")

  const userSubs = await db.subscription.findMany({
    include: { organization: true },
  })

  // Filter those still shaped like user-based (organization linkage may be null because of older schema)
  const users = await db.user.findMany({ include: { organization: { include: { subscription: true } }, Subscription: true } }) as any[]

  let created = 0
  let updated = 0

  for (const u of users) {
    const orgId = u.organizationId
    if (!orgId) continue
    const userSub = u.Subscription
    const orgSub = u.organization?.subscription

    if (!userSub) continue // nothing to migrate for this user

    if (!orgSub) {
      // Create new org subscription from user sub snapshot
      await db.subscription.create({
        data: {
          organizationId: orgId,
          status: userSub.status,
          trialStart: userSub.trialStart,
          trialEnd: userSub.trialEnd,
          trialUsed: userSub.trialUsed,
          currentPeriodEnd: userSub.currentPeriodEnd,
        },
      })
      created++
    } else {
      // Merge windows/status
      const mergedTrialStart = orgSub.trialStart < userSub.trialStart ? orgSub.trialStart : userSub.trialStart
      const mergedTrialEnd = orgSub.trialEnd > userSub.trialEnd ? orgSub.trialEnd : userSub.trialEnd
      const mergedStatusPriority = (s: string) => ({ ACTIVE: 3, TRIAL: 2, EXPIRED: 1, CANCELED: 0 } as any)[s] || 0
      const finalStatus = mergedStatusPriority(userSub.status) > mergedStatusPriority(orgSub.status) ? userSub.status : orgSub.status

      await db.subscription.update({
        where: { id: orgSub.id },
        data: {
          trialStart: mergedTrialStart,
          trialEnd: mergedTrialEnd,
          status: finalStatus,
          currentPeriodEnd: orgSub.currentPeriodEnd || userSub.currentPeriodEnd,
        },
      })
      updated++
    }

    // Relink payments/email logs referencing userId subscription
    if (userSub.id) {
      const newOrgSub = await db.subscription.findUnique({ where: { organizationId: orgId } })
      if (!newOrgSub) continue

      await db.payment.updateMany({
        where: { userId: u.id, subscriptionId: userSub.id },
        data: { subscriptionId: newOrgSub.id, organizationId: orgId },
      })
      await db.emailLog.updateMany({
        where: { userId: u.id, subscriptionId: userSub.id },
        data: { subscriptionId: newOrgSub.id, organizationId: orgId },
      })
    }
  }

  console.log(`Migration complete. Created org subs: ${created}, Updated existing org subs: ${updated}`)
}

run().catch((e) => {
  console.error("Migration failed", e)
  process.exit(1)
})
