/**
 * Role-Based Access Control (RBAC) Utilities
 * Client-side helpers for permission checks and role-based rendering
 */

import { useAuth } from "@/contexts/auth-context"
import type { Permission } from "@/lib/permissions"

export type UserRole = 
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "ORG_MEMBER"
  | "CLIENT"

/**
 * Hook to check if user has a specific role
 */
export function useRole() {
  const { user } = useAuth()
  
  return {
    isSuperAdmin: user?.role === "SUPER_ADMIN" || user?.isSuperAdmin,
    isAdmin: ["SUPER_ADMIN", "ORG_ADMIN"].includes(user?.role),
    isManager: ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(user?.role),
    isEmployee: user?.role === "EMPLOYEE" || user?.role === "ORG_MEMBER",
    isClient: user?.role === "CLIENT",
    role: user?.role as UserRole,
  }
}

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { user, isSuperAdmin } = useAuth()
  const role = user?.role as UserRole
  // Read explicit permissions from the user record (if present in session)
  const explicitPermissions = (user as any)?.permissions || ([] as Permission[])

  // Helper to decide final permission: true if super admin OR explicitPermissions includes it OR role-based default
  const granted = (perm: Permission, defaultValue: boolean) => {
    if (isSuperAdmin) return true
    if (explicitPermissions.includes(perm)) return true
    return defaultValue
  }

  // Role-based defaults (unchanged semantics)
  const roleDefaults: Record<string, Record<string, boolean>> = {
    SUPER_ADMIN: {
      canViewAllOrgs: true,
      canEditOrg: true,
      canDeleteOrg: true,
      canManageUsers: true,
      canInviteUsers: true,
      canViewAllTasks: true,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: true,
      canViewAllChannels: true,
      canManageChannels: true,
      canDeleteChannels: true,
      canManageProjects: true,
      canViewReports: true,
    },
    ORG_ADMIN: {
      canViewAllOrgs: false,
      canEditOrg: true,
      canDeleteOrg: false,
      canManageUsers: true,
      canInviteUsers: true,
      canViewAllTasks: true,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: true,
      canViewAllChannels: true,
      canManageChannels: true,
      canDeleteChannels: false,
      canManageProjects: true,
      canViewReports: true,
    },
    MANAGER: {
      canViewAllOrgs: false,
      canEditOrg: false,
      canDeleteOrg: false,
      canManageUsers: false,
      canInviteUsers: true,
      canViewAllTasks: false,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: false,
      canViewAllChannels: false,
      canManageChannels: false,
      canDeleteChannels: false,
      canManageProjects: true,
      canViewReports: true,
    },
    EMPLOYEE: {
      canViewAllOrgs: false,
      canEditOrg: false,
      canDeleteOrg: false,
      canManageUsers: false,
      canInviteUsers: false,
      canViewAllTasks: false,
      canCreateTasks: false,
      canEditTasks: true,
      canDeleteTasks: false,
      canViewAllChannels: false,
      canManageChannels: false,
      canDeleteChannels: false,
      canManageProjects: false,
      canViewReports: false,
    },
    CLIENT: {
      canViewAllOrgs: false,
      canEditOrg: false,
      canDeleteOrg: false,
      canManageUsers: false,
      canInviteUsers: false,
      canViewAllTasks: false,
      canCreateTasks: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canViewAllChannels: false,
      canManageChannels: false,
      canDeleteChannels: false,
      canManageProjects: false,
      canViewReports: true,
    },
  }

  const defaults = roleDefaults[role || "CLIENT"] || roleDefaults.CLIENT

  return {
    canViewAllOrgs: granted("ORG_VIEW", defaults.canViewAllOrgs),
    canEditOrg: granted("ORG_EDIT", defaults.canEditOrg),
    canDeleteOrg: granted("ORG_DELETE", defaults.canDeleteOrg),
    canManageUsers: granted("ORG_USERS_MANAGE", defaults.canManageUsers),
    canInviteUsers: granted("ORG_USERS_INVITE", defaults.canInviteUsers),
    canViewAllTasks: granted("TASK_VIEW_ALL", defaults.canViewAllTasks),
    // Accept either TASK_CREATE or PROJECT_MANAGE for creating tasks
    canCreateTasks: granted("TASK_CREATE", defaults.canCreateTasks) || granted("PROJECT_MANAGE", defaults.canManageProjects),
    canEditTasks: granted("TASK_EDIT", defaults.canEditTasks),
    canDeleteTasks: granted("TASK_DELETE", defaults.canDeleteTasks),
    canViewAllChannels: granted("CHANNEL_VIEW_ALL", defaults.canViewAllChannels),
    canManageChannels: granted("CHANNEL_MANAGE", defaults.canManageChannels),
    canDeleteChannels: granted("CHANNEL_DELETE", defaults.canDeleteChannels),
    canManageProjects: granted("PROJECT_MANAGE", defaults.canManageProjects),
    canViewReports: granted("REPORTS_VIEW", defaults.canViewReports),
  }
}

/**
 * Component wrapper for role-based rendering
 */
export function RoleGuard({ 
  roles, 
  children,
  fallback = null 
}: { 
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user } = useAuth()
  const userRole = user?.role as UserRole
  
  if (!user || !roles.includes(userRole)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Component wrapper for permission-based rendering
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null
}: {
  permission: keyof ReturnType<typeof usePermissions>
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const permissions = usePermissions()
  
  if (!permissions[permission]) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Component wrapper for super admin only content
 */
export function SuperAdminOnly({ 
  children,
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isSuperAdmin } = useAuth()
  
  if (!isSuperAdmin) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Component wrapper for org admin content
 */
export function OrgAdminOnly({ 
  children,
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isOrgAdmin } = useAuth()
  
  if (!isOrgAdmin) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Utility to get role display name
 */
export function getRoleDisplayName(role: string | undefined): string {
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: "Super Administrator",
    ORG_ADMIN: "Organization Admin",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
    ORG_MEMBER: "Member",
    CLIENT: "Client",
  }
  
  return roleMap[role || ""] || role || "Unknown"
}

/**
 * Utility to get role badge color
 */
export function getRoleBadgeVariant(role: string | undefined): "default" | "destructive" | "secondary" | "outline" {
  const colorMap: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    SUPER_ADMIN: "destructive",
    ORG_ADMIN: "default",
    MANAGER: "secondary",
    EMPLOYEE: "outline",
    ORG_MEMBER: "outline",
    CLIENT: "secondary",
  }
  
  return colorMap[role || ""] || "outline"
}
