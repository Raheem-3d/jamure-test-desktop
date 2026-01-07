/**
 * NextAuth Type Definitions
 * 
 * Extends the default NextAuth types to include custom user fields
 * required for the RBAC permission system.
 * 
 * Place this file in your project to fix TypeScript errors in:
 * - usePermissions hook
 * - Session-based permission checks
 * - Any component using session.user fields
 */

import "next-auth"

declare module "next-auth" {
  /**
   * Extended Session interface with custom user fields
   */
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      permissions: string // JSON string array
      isSuperAdmin: boolean
      organizationId?: string | null
      departmentId?: string | null
    }
  }

  /**
   * Extended User interface (optional, for consistency)
   */
  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: string
    permissions: string
    isSuperAdmin: boolean
    organizationId?: string | null
    departmentId?: string | null
  }
}

declare module "next-auth/jwt" {
  /**
   * Extended JWT interface with custom fields
   */
  interface JWT {
    id: string
    email: string
    role: string
    permissions: string
    isSuperAdmin: boolean
    organizationId?: string | null
    departmentId?: string | null
  }
}

export {}
