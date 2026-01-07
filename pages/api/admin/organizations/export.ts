import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import prisma from '@/prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const email = (token as any)?.email as string | undefined
  const superAdmins = (process.env.SUPERADMINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!email || !superAdmins.includes(email.toLowerCase())) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin required' } })
    return
  }

  const orgs = await prisma.organization.findMany({
    include: { subscription: true },
    orderBy: { createdAt: 'desc' }
  })

  const headers = ['id','name','primaryEmail','createdAt','suspended','subscriptionStatus','trialStart','trialEnd']
  const rows = orgs.map((o: any) => [
    o.id,
    o.name,
    o.primaryEmail,
    o.createdAt.toISOString(),
    o.suspended ? 'true' : 'false',
    o.subscription?.status || '',
    o.subscription?.trialStart?.toISOString?.() || '',
    o.subscription?.trialEnd?.toISOString?.() || ''
  ])

  const csv = [
    headers.join(','),
    ...rows.map((r: any[]) => r.map((v: any) => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v).join(','))
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="organizations.csv"')
  res.status(200).send(csv)
}
