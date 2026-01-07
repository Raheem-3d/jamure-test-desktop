import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSessionOrMobileUser } from './mobile-auth'

export async function getSessionUser(req?: any) {
  // If a request is provided, prefer mobile token or NextAuth session via helper
  if (req) {
    try {
      const mobileOrSessionUser = await getSessionOrMobileUser(req as Request)
      if (mobileOrSessionUser) return mobileOrSessionUser
    } catch (e) {
      // fallback to server session below
    }
  }

  const session = (await getServerSession(authOptions as any)) as any
  return session?.user || null
}

export async function getOrganizationContext(req?: any) {
  const user = await getSessionUser(req)
  const organizationId = user?.organizationId || null
  if (!organizationId) return { organizationId: null, subscription: null }
  const subscription = await db.subscription.findUnique({ where: { organizationId } })
  return { organizationId, subscription }
}

export async function assertOrgAccess(req?: any) {
  const { organizationId } = await getOrganizationContext(req)
  if (!organizationId) {
    const err: any = new Error("Organization not found in session")
    err.status = 403
    throw err
  }
  return organizationId
}

export function isSuperAdmin(email?: string | null) {
  const env = process.env.SUPERADMINS || ""
  const list = env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  return !!(email && list.includes(email.toLowerCase()))
}

/**
 * Get tenant-scoped where clause for database queries
 * Super admins can access all data across organizations
 * Regular users are limited to their organization
 */
export async function getTenantWhereClause(additionalWhere: any = {}, req?: any) {
  const user = await getSessionUser(req)
  
  // Check if user is super admin
  const userIsSuperAdmin = user?.isSuperAdmin || isSuperAdmin(user?.email)
  
  // Super admins can see all data
  if (userIsSuperAdmin) {
    return additionalWhere
  }
  
  // Regular users see only their organization's data
  const organizationId = user?.organizationId
  
  return {
    ...additionalWhere,
    organizationId: organizationId || undefined,
  }
}

/**
 * Assert that user has access to a specific organization
 * Super admins can access any organization
 * Regular users can only access their own organization
 */
export async function assertOrganizationAccess(targetOrgId: string, req?: any) {
  const user = await getSessionUser(req)
  const userIsSuperAdmin = user?.isSuperAdmin || isSuperAdmin(user?.email)
  
  // Super admins can access any organization
  if (userIsSuperAdmin) {
    return true
  }
  
  // Regular users can only access their own organization
  if (user?.organizationId !== targetOrgId) {
    const err: any = new Error("Forbidden: Cannot access data from another organization")
    err.status = 403
    throw err
  }
  
  return true
}

/**
 * Get user with super admin check
 */
export async function getSessionUserWithPermissions(req?: any) {
  const user = await getSessionUser(req)
  if (!user) {
    const err: any = new Error("Unauthorized")
    err.status = 401
    throw err
  }
  
  const userIsSuperAdmin = user?.isSuperAdmin || isSuperAdmin(user?.email)
  
  return {
    ...user,
    isSuperAdmin: userIsSuperAdmin,
  }
}

/**
 * Assert user is authenticated
 */
export async function assertAuthenticated(req?: any) {
  const user = await getSessionUser(req)
  if (!user) {
    const err: any = new Error("Unauthorized: Authentication required")
    err.status = 401
    throw err
  }
  return user
}
