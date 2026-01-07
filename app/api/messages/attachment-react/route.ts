import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { messageId, attachmentIndex, emoji } = await req.json()
    if (!messageId || typeof attachmentIndex !== "number" || !emoji) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })

    const attachments = Array.isArray(message.attachments) ? (message.attachments as any[]) : []
    if (attachmentIndex < 0 || attachmentIndex >= attachments.length) {
      return NextResponse.json({ error: "Attachment index out of range" }, { status: 400 })
    }

    const att = attachments[attachmentIndex] || {}
    const reactions = Array.isArray(att.reactions) ? att.reactions : []

    // toggle: if user already reacted, remove; otherwise add
    const existingIndex = reactions.findIndex((r: any) => r.emoji === emoji && r.userId === user.id)
    if (existingIndex >= 0) reactions.splice(existingIndex, 1)
    else reactions.push({ emoji, userId: user.id, userName: user.name })

    att.reactions = reactions
    attachments[attachmentIndex] = att

    const updated = await db.message.update({ where: { id: messageId }, data: { attachments } })

    return NextResponse.json({ success: true, attachments: updated.attachments })
  } catch (error) {
    console.error("attachment-react error", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
