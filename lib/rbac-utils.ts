"use client"
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { DefaultRolePermissions, hasPermission, type Permission } from "@/lib/permissions"

/**
 * Hook to check user permissions in React components
 * VERSION: 3.0 - Fixed canCreateTasks default to false
 */
export function usePermissions() {
  const { data: session, status } = useSession()
  const user = session?.user as any
  
  const role = user?.role as string | undefined
  const isSuperAdmin = user?.isSuperAdmin === true
  
  // Get user's explicit permissions from session
  const userPermissions: Permission[] = useMemo(() => {
    if (!user?.permissions) return []
    return Array.isArray(user.permissions) ? user.permissions : []
  }, [user?.permissions])

  // Check permission - returns FALSE if no role
  const checkPermission = (permission: Permission): boolean => {
    // CRITICAL: No role means NO permissions at all
    if (!role || role === undefined || role === null) {
      return false
    }
    return hasPermission(role, permission, isSuperAdmin, userPermissions)
  }
  
  // ALL permissions default to FALSE, only true if role exists AND has permission
  const permissions = {
    canCreateTasks: false,
    canEditTasks: false,
    canDeleteTasks: false,
    canViewAllTasks: false,
    canCreateChannels: false,
    canManageChannels: false,
    canDeleteChannels: false,
    canViewAllChannels: false,
    canManageUsers: false,
    canInviteUsers: false,
    canEditOrg: false,
    canDeleteOrg: false,
    canViewAllOrgs: false,
    canViewReports: false,
    canManageProjects: false,
  }
  
  // Only compute if role exists
  if (role) {
    permissions.canCreateTasks = checkPermission('TASK_CREATE')
    permissions.canEditTasks = checkPermission('TASK_EDIT')
    permissions.canDeleteTasks = checkPermission('TASK_DELETE')
    permissions.canViewAllTasks = checkPermission('TASK_VIEW_ALL')
    permissions.canCreateChannels = checkPermission('CHANNEL_CREATE')
    permissions.canManageChannels = checkPermission('CHANNEL_MANAGE')
    permissions.canDeleteChannels = checkPermission('CHANNEL_DELETE')
    permissions.canViewAllChannels = checkPermission('CHANNEL_VIEW_ALL')
    permissions.canManageUsers = checkPermission('ORG_USERS_MANAGE')
    permissions.canInviteUsers = checkPermission('ORG_USERS_INVITE')
    permissions.canEditOrg = checkPermission('ORG_EDIT')
    permissions.canDeleteOrg = checkPermission('ORG_DELETE')
    permissions.canViewAllOrgs = checkPermission('CROSS_ORG_ACCESS')
    permissions.canViewReports = checkPermission('REPORTS_VIEW')
    permissions.canManageProjects = checkPermission('PROJECT_MANAGE')
  }
  
  return {
    can: checkPermission,
    ...permissions,
    userPermissions,
    role,
    isAdmin: role === 'ORG_ADMIN' || role === 'SUPER_ADMIN',
    isManager: role === 'MANAGER',
    isEmployee: role === 'EMPLOYEE',
    isSuperAdmin,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}
