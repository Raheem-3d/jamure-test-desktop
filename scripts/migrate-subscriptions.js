/*
  Migration Script: Convert legacy user-based subscriptions to organization-based subscriptions.
  Safe to run multiple times. Best-effort: will try raw queries for legacy rows if schema permits.
  Run:
    npm run migrate:subs
*/

async function run() {
  const path = require("path")
  const prismaPath = path.join(__dirname, "..", "prisma", "client.js")
  const { default: prisma } = require(prismaPath)

  let created = 0
  let updated = 0
  let linkedPayments = 0
  let linkedEmails = 0

  console.log("Starting subscription migration...")

  // Get users with an organization
  const users = await prisma.user.findMany({
    where: { organizationId: { not: null } },
    select: { id: true, organizationId: true },
  })

  for (const u of users) {
    const orgId = u.organizationId
    if (!orgId) continue

    // Ensure org subscription exists
    let orgSub = await prisma.subscription.findUnique({ where: { organizationId: orgId } }).catch(() => null)

    // Try to detect legacy user-based subscription row via raw SQL
    let legacySub = null
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, status, trialStart, trialEnd, trialUsed, currentPeriodEnd FROM Subscription WHERE userId = ? LIMIT 1`,
        u.id
      )
      if (Array.isArray(rows) && rows.length > 0) {
        // Normalize date conversion
        const r = rows[0]
        legacySub = {
          id: r.id,
          status: r.status,
          trialStart: new Date(r.trialStart),
          trialEnd: new Date(r.trialEnd),
          trialUsed: !!r.trialUsed,
          currentPeriodEnd: r.currentPeriodEnd ? new Date(r.currentPeriodEnd) : null,
        }
      }
    } catch (e) {
      // Likely the userId column no longer exists; ignore
    }

    if (!orgSub && legacySub) {
      await prisma.subscription.create({
        data: {
          organizationId: orgId,
          status: legacySub.status,
          trialStart: legacySub.trialStart,
          trialEnd: legacySub.trialEnd,
          trialUsed: legacySub.trialUsed,
          currentPeriodEnd: legacySub.currentPeriodEnd,
        },
      })
      created++
      orgSub = await prisma.subscription.findUnique({ where: { organizationId: orgId } })
    } else if (orgSub && legacySub) {
      const priority = (s) => ({ ACTIVE: 3, TRIAL: 2, EXPIRED: 1, CANCELED: 0 }[s] || 0)
      const mergedStatus = priority(legacySub.status) > priority(orgSub.status) ? legacySub.status : orgSub.status
      const mergedTrialStart = orgSub.trialStart < legacySub.trialStart ? orgSub.trialStart : legacySub.trialStart
      const mergedTrialEnd = orgSub.trialEnd > legacySub.trialEnd ? orgSub.trialEnd : legacySub.trialEnd
      const mergedCurrentEnd = orgSub.currentPeriodEnd || legacySub.currentPeriodEnd
      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          status: mergedStatus,
          trialStart: mergedTrialStart,
          trialEnd: mergedTrialEnd,
          currentPeriodEnd: mergedCurrentEnd,
        },
      })
      updated++
    }

    // Re-link payments for this user to organization
    const payments = await prisma.payment.findMany({ where: { userId: u.id, organizationId: null } })
    for (const p of payments) {
      await prisma.payment.update({ where: { id: p.id }, data: { organizationId: orgId } })
      linkedPayments++
    }

    // Re-link email logs for this user to organization
    const emails = await prisma.emailLog.findMany({ where: { userId: u.id, organizationId: null } })
    for (const e of emails) {
      await prisma.emailLog.update({ where: { id: e.id }, data: { organizationId: orgId } })
      linkedEmails++
    }
  }

  console.log(
    `Migration done. Org subscriptions created: ${created}, merged: ${updated}, payments linked: ${linkedPayments}, email logs linked: ${linkedEmails}`
  )
  await prisma.$disconnect()
}

run().catch(async (e) => {
  console.error("Migration failed:", e)
  process.exit(1)
})
