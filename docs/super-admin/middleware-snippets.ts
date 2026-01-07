// Middleware / Auth / Impersonation Notes

/* isSuperAdmin Guard (Next.js API Route Example)
import { getServerSession } from 'next-auth';

export async function superAdminOnly(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Super admin required' } }), { status: 403 });
  }
}
*/

/* Impersonation Flow
1. POST /api/admin/organizations/:id/impersonate
  - Validate super admin
  - Create short-lived JWT with claims: { sub: superAdminId, impersonatingOrgId, originalUserId: superAdminId }
  - Set cookie `impersonation=1` and session override
  - Log AuditLog { action: 'IMPERSONATE_START', impersonation: true }
2. Exit impersonation (POST /api/admin/impersonation/exit)
  - Restore original session
  - Log AuditLog { action: 'IMPERSONATE_END', impersonation: true }
3. UI shows banner while `impersonation=1` cookie present.
*/

/* Billing CTA Logic
if (new Date() >= trialEndsAt) {
  // enable Buy Now
} else {
  // show View Plans (pre-billing modal)
}
*/

/* Trial Days Left Utility
function daysLeft(trialEndsAt: Date) {
  const diff = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
*/
