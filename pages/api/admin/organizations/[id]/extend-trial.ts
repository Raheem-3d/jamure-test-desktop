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
  const { days } = req.body as { days?: number }
  const extendBy = Math.min(30, Math.max(1, Number(days || 0)))
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } })
  if (!sub) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subscription not found' } })
  const base = sub.trialEnd || new Date()
  const next = new Date(base.getTime() + extendBy * 24*60*60*1000)
  await prisma.subscription.update({ where: { organizationId: orgId }, data: { trialEnd: next } })
  try {
    const userId = (token as any)?.id as string | undefined
    await prisma.activityLog.create({ data: { organizationId: orgId, userId: userId || null, action: 'TRIAL_EXTEND', details: { days: extendBy }, }
    })
  } catch {}
  res.status(200).json({ trialEnd: next.toISOString() })
}
