import { db } from "./db"

// lib/tokens.ts
export async function verifyToken(token: string, email: string) {
  const tokenRecord = await db.invitationToken.findUnique({
    where: { token },
    include: { task: true }
  })

  if (!tokenRecord || tokenRecord.email !== email) {
    return null
  }

  if (tokenRecord.expires < new Date()) {
    await db.invitationToken.delete({ where: { token } })
    return null
  }

  return {
    taskId: tokenRecord.taskId,
    email: tokenRecord.email
  }
}

