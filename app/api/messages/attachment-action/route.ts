import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitToChannel, emitToUser } from "@/lib/socket-server";

type Body = {
  messageId: string;
  attachmentIndex: number;
  action: "toggle-reaction" | "pin" | "delete" | "edit";
  emoji?: string;
  pin?: boolean;
  newFileName?: string | null;
};

export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json()) as Body;
    const { messageId, attachmentIndex, action } = body;

    if (!messageId || typeof attachmentIndex !== "number")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const message = await db.message.findUnique({ where: { id: messageId } });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const attachments = Array.isArray(message.attachments) ? (message.attachments as any[]) : [];
    if (attachmentIndex < 0 || attachmentIndex >= attachments.length)
      return NextResponse.json({ error: "Attachment index out of range" }, { status: 400 });

    const att = attachments[attachmentIndex] || {};

    // Permission check for destructive edits
    const isSender = message.senderId === user.id;

    if (action === "toggle-reaction") {
      const emoji = body.emoji;
      if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 });

      const reactions = Array.isArray(att.reactions) ? [...att.reactions] : [];
      const existingIndex = reactions.findIndex((r) => r.emoji === emoji && r.userId === user.id);
      if (existingIndex >= 0) reactions.splice(existingIndex, 1);
      else reactions.push({ emoji, userId: user.id, userName: user.name || undefined });

      attachments[attachmentIndex] = { ...att, reactions };
    } else if (action === "pin") {
      const pin = !!body.pin;
      attachments[attachmentIndex] = { ...att, isPinned: pin };
    } else if (action === "delete") {
      // only sender can delete attachments
      if (!isSender) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      attachments.splice(attachmentIndex, 1);
    } else if (action === "edit") {
      if (!isSender) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      const newFileName = typeof body.newFileName === "string" ? body.newFileName : null;
      attachments[attachmentIndex] = { ...att, fileName: newFileName };
    }

    // Persist
    await db.message.update({ where: { id: messageId }, data: { attachments: attachments as any } });

    // Emit update via sockets so other clients can refresh
    if (message.channelId) {
      emitToChannel(message.channelId, "message:attachments-updated", { messageId, attachments });
    } else if (message.receiverId) {
      // DM: notify both sides
      emitToUser(message.receiverId, "message:attachments-updated", { messageId, attachments });
      emitToUser(message.senderId, "message:attachments-updated", { messageId, attachments });
    }

    return NextResponse.json({ attachments });
  } catch (e) {
    console.error("attachment-action error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
