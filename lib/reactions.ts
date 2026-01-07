// // lib/reactions.ts
// // import { prisma } from "@/lib/prisma"

import { db } from "./db";



export type ReactionEntry = { emoji: string; userId: string; userName?: string }

export async function getReactions(messageId: string): Promise<ReactionEntry[]> {
  const msg = await db.message.findUnique({ where: { id: messageId }, select: { reactions: true }})
  const arr = Array.isArray(msg?.reactions) ? (msg!.reactions as ReactionEntry[]) : []
  return arr
}

export async function addReactionJSON(messageId: string, r: ReactionEntry) {
  const current = await getReactions(messageId)
  if (current.some(x => x.emoji === r.emoji && x.userId === r.userId)) return current
  const updated = [...current, r]
  await db.message.update({ where: { id: messageId }, data: { reactions: updated as any }})
  return updated
}

export async function removeReactionJSON(messageId: string, r: { emoji: string; userId: string }) {
  const current = await getReactions(messageId)
  const updated = current.filter(x => !(x.emoji === r.emoji && x.userId === r.userId))
  await db.message.update({ where: { id: messageId }, data: { reactions: updated as any }})
  return updated
}

export async function getMessageChannelId(messageId: string): Promise<string | null> {
  const m = await db.message.findUnique({ where: { id: messageId }, select: { channelId: true }})
  return m?.channelId ?? null
}

export async function getMessagePeers(messageId: string): Promise<{ senderId: string; receiverId: string | null }> {
  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { senderId: true, receiverId: true },
  })
  if (!msg) throw new Error("Message not found")
  return { senderId: msg.senderId, receiverId: msg.receiverId }
}