import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertOrgAccess } from "@/lib/org"
import { hasPermission } from "@/lib/permissions"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const user: any = (session as any)?.user || {}
  if (!user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (!hasPermission(user.role, "ORG_USERS_INVITE")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const organizationId = await assertOrgAccess()
  const { email, inviteRole } = await req.json()
  if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 })
  const token = randomBytes(24).toString("hex")
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser && existingUser.organizationId === organizationId) {
    return NextResponse.json({ message: "User already in organization" }, { status: 400 })
  }

  const invite = await db.orgInvite.create({
    data: {
      organizationId,
      email,
      role: inviteRole || "EMPLOYEE",
      token,
      expires,
    },
  })

  const link = `${process.env.APP_BASE_URL || "http://localhost:3000"}/register?invite=${token}`
  await sendEmail({
    to: email,
    subject: "You're invited to join an organization",
    html: `<p>You have been invited to join an organization. Click <a href="${link}">here</a> to accept.</p>`,
    userId: user.id,
    subscriptionId: null,
  })

  return NextResponse.json({ invite })
}
