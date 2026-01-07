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
  const cookies = req.headers.cookie || ''
  const match = cookies.split(';').map(v => v.trim()).find(c => c.startsWith('impersonation_org='))
  const orgId = match ? decodeURIComponent(match.split('=')[1] || '') : null

  // Clear cookie
  res.setHeader('Set-Cookie', `impersonation_org=; Path=/; Max-Age=0; SameSite=Lax`)
   
    
  // Log
  try {
    const userId = (token as any)?.id as string | undefined
    if (orgId) {
      await prisma.activityLog.create({ data: { organizationId: orgId, userId: userId || null, action: 'IMPERSONATE_END', details: { actorEmail: email } } })
    }
  } catch {}

  res.writeHead(303, { Location: `/admin` })
  res.end()
}





