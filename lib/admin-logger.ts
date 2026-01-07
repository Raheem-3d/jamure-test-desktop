import prisma from '@/prisma/client'

export type AdminAction = 
  | 'TRIAL_EXTEND'
  | 'TRIAL_CONVERT'
  | 'IMPR_START'
  | 'IMPR_END'
  | 'ORG_SUSPEND'
  | 'ORG_UNSUSPEND'
  | 'SUPERADMIN_TOGGLE'
  | 'ANNOUNCEMENT_SENT'
  | 'FORCE_EXPIRE'

interface LogParams {
  action: AdminAction
  actorId?: string
  actorEmail?: string
  organizationId?: string
  details?: Record<string, any>
  impersonation?: boolean
  reason?: string
}

/**
 * Centralized admin activity logger
 * Ensures consistent logging format across all admin actions
 */
export async function logAdminAction({
  action,
  actorId,
  actorEmail,
  organizationId,
  details = {},
  impersonation = false,
  reason,
}: LogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        userId: actorId || null,
        organizationId: organizationId || null,
        details: {
          ...details,
          actorEmail,
          impersonation,
          timestamp: new Date().toISOString(),
        },
        // If schema has these fields:
        // reason: reason || null,
        // impersonation,
      },
    })
  } catch (error) {
    console.error('[AdminLogger] Failed to log action:', error)
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Helper to extract admin user info from NextAuth token
 */
export function getAdminActorFromToken(token: any): { id?: string; email?: string } {
  return {
    id: token?.id || token?.sub,
    email: token?.email,
  }
}
