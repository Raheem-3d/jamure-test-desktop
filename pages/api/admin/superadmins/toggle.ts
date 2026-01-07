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
  const { email: targetEmail, enable } = req.body as { email?: string; enable?: string }
  if (!targetEmail) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'email required' } })
  const user = await prisma.user.findUnique({ where: { email: targetEmail } })
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } })
  const flag = enable === 'true'
  await prisma.user.update({ where: { email: targetEmail }, data: { isSuperAdmin: flag } })
  return res.status(200).json({ email: targetEmail, isSuperAdmin: flag })
}
