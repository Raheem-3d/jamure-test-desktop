import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import prisma from '@/prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } })
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const email = (token as any)?.email as string | undefined
  const superAdmins = (process.env.SUPERADMINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!email || !superAdmins.includes(email.toLowerCase())) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin required' } })
  }
  const orgId = req.query.id as string
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } })
  if (!sub) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subscription not found' } })

  if (sub.status === 'ACTIVE') {
    // Idempotent handling: already converted
    try {
      const userId = (token as any)?.id as string | undefined
      await prisma.activityLog.create({ data: { organizationId: orgId, userId: userId || null, action: 'TRIAL_CONVERT', details: { previousStatus: sub.status, idempotent: true } } })
    } catch {}
    return res.status(200).json({ status: 'ACTIVE' })
  }

  const updated = await prisma.subscription.update({
    where: { organizationId: orgId },
    data: {
      status: 'ACTIVE',
      // Optionally clamp trialEnd to now so UI shows Active not leftover days
      trialEnd: sub.trialEnd && sub.trialEnd > new Date() ? new Date() : sub.trialEnd,
    }
  })

  try {
    const userId = (token as any)?.id as string | undefined
    await prisma.activityLog.create({ data: { organizationId: orgId, userId: userId || null, action: 'TRIAL_CONVERT', details: { previousStatus: sub.status } } })
  } catch {}

  res.status(200).json({ status: updated.status })
}
