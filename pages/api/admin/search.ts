import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import prisma from '@/prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const email = (token as any)?.email as string | undefined
  const superAdmins = (process.env.SUPERADMINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!email || !superAdmins.includes(email.toLowerCase())) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin required' } })
  }
  const q = (req.query.q as string || '').trim()
  if (!q) return res.status(200).json({ items: [] })

  const items = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { primaryEmail: { contains: q, mode: 'insensitive' } },
        { id: q },
        { users: { some: { email: { contains: q, mode: 'insensitive' }, role: 'ADMIN' } } }
      ]
    },
    take: 10,
    select: { id: true, name: true, primaryEmail: true }
  })

  res.status(200).json({ items })
}
