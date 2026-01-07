import { NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { computeOneYearPeriodEnd, getIstNowUtc } from "@/lib/subscription-utils"
import { sendEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ message: "Webhook secret not configured" }, { status: 500 })
    }

    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature") || ""
    const shasum = crypto.createHmac("sha256", webhookSecret)
    shasum.update(rawBody)
    const digest = shasum.digest("hex")

    if (digest !== signature) {
      console.warn("Invalid Razorpay webhook signature")
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(rawBody)

    // Handle payment captured -> mark payment paid, activate subscription
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity || event.payload?.order?.entity
      const orderId: string = payment?.order_id || payment?.id
      const paymentId: string = payment?.id

      if (!orderId) {
        return NextResponse.json({ ok: true })
      }

  const dbPayment = await db.payment.findUnique({ where: { orderId } })
      if (!dbPayment) {
        return NextResponse.json({ ok: true })
      }

      if (dbPayment.status !== "PAID") {
        await db.payment.update({
          where: { orderId },
          data: { status: "PAID", paymentId, signature },
        })
      }

      // Activate or extend subscription by 1 year from max(trialEnd/now)
      // Organization-based subscription
      let sub = null as any
      if (dbPayment.organizationId) {
        sub = await db.subscription.findUnique({ where: { organizationId: dbPayment.organizationId } })
      }
      if (!sub && dbPayment.userId) {
        // Fallback: if migrated data not yet in org subscription
        const user = await db.user.findUnique({ where: { id: dbPayment.userId } })
        if (user?.organizationId) {
          sub = await db.subscription.findUnique({ where: { organizationId: user.organizationId } })
        }
      }
      const nowUtc = getIstNowUtc()
      if (sub) {
        const base = sub.currentPeriodEnd && sub.currentPeriodEnd > nowUtc ? sub.currentPeriodEnd : nowUtc
        const newEnd = computeOneYearPeriodEnd(base)
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "ACTIVE", currentPeriodEnd: newEnd },
        })

        // Send receipt email
        // Choose org admin user for receipt
        const org = await db.organization.findUnique({
          where: { id: sub.organizationId },
          include: { users: true },
        })
  const adminUser = org?.users.find((u: any) => u.role === "ORG_ADMIN") || org?.users[0]
        if (adminUser) {
          await sendEmail({
            to: adminUser.email,
            subject: `Payment received - JamureChat`,
            html: `<p>Hi ${adminUser.name || "there"},</p><p>We received your payment. Your subscription is active until <b>${newEnd.toISOString()}</b>.</p>`,
            logType: "PAYMENT_RECEIPT",
            userId: adminUser.id,
            subscriptionId: sub.id,
            metadata: { orderId, paymentId, organizationId: sub.organizationId },
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Webhook error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
