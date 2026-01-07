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
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } })

  // Set a readable cookie so client banner can display
  res.setHeader('Set-Cookie', `impersonation_org=${encodeURIComponent(orgId)}; Path=/; SameSite=Lax`)

  // Log activity
  try {
    const userId = (token as any)?.id as string | undefined
    await prisma.activityLog.create({ data: { organizationId: orgId, userId: userId || null, action: 'IMPERSONATE_START', details: { actorEmail: email } } })
  } catch {}

  // Redirect to org detail in admin
  res.writeHead(303, { Location: `/admin/organizations/${orgId}` })
  res.end()
}
