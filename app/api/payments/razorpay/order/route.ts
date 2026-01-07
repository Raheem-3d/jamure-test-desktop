import { NextResponse } from "next/server"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { amountInPaise } = await req.json().catch(() => ({ amountInPaise: undefined }))
    const amount = Number(amountInPaise || process.env.SUBSCRIPTION_PRICE_PAISE || 99900) // default ₹999.00

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ message: "Razorpay not configured" }, { status: 500 })
    }

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const order = await rzp.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${user.organizationId || user.id}_${Date.now()}`,
      notes: { userId: user.id, organizationId: user.organizationId || "" },
    })

    // persist payment record
    await db.payment.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId || null,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: "CREATED",
      },
    })

    return NextResponse.json({ order, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    console.error("Create order error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
