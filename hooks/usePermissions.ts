"use client"
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { DefaultRolePermissions, hasPermission, type Permission } from "@/lib/permissions"

/**
 * Hook to check user permissions
 * Combines role-based permissions with explicit user permissions
 */
export function usePermissions() {
  const { data: session } = useSession()
  const user = session?.user
  
  // Parse user's explicit permissions from JSON
  const userPermissions = useMemo(() => {
    if (!user?.permissions) return []
    try {
      const parsed = JSON.parse(String(user.permissions))
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [user?.permissions])
  
  /**
   * Check if user has a specific permission
   */
  const can = (permission: Permission): boolean => {
    if (!user) return false
    return hasPermission(
      user.role,
      permission,
      user.isSuperAdmin,
      userPermissions
    )
  }
  
  // Common permission checks
  const canCreateTask = can('TASK_CREATE')
  const canEditTask = can('TASK_EDIT')
  const canDeleteTask = can('TASK_DELETE')
  const canViewAllTasks = can('TASK_VIEW_ALL')
  
  const canCreateChannel = can('CHANNEL_CREATE')
  const canManageChannel = can('CHANNEL_MANAGE')
  const canDeleteChannel = can('CHANNEL_DELETE')
  const canViewAllChannels = can('CHANNEL_VIEW_ALL')
  
  const canManageUsers = can('ORG_USERS_MANAGE')
  const canManageOrg = can('ORG_EDIT')
  const canViewReports = can('REPORTS_VIEW')
  
  return {
    can,
    
    // Task permissions
    canCreateTask,
    canEditTask,
    canDeleteTask,
    canViewAllTasks,
    
    // Channel permissions
    canCreateChannel,
    canManageChannel,
    canDeleteChannel,
    canViewAllChannels,
    
    // Organization permissions
    canManageUsers,
    canManageOrg,
    canViewReports,
    
    // User info
    userPermissions,
    role: user?.role,
    isAdmin: user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN',
    isManager: user?.role === 'MANAGER',
    isEmployee: user?.role === 'EMPLOYEE',
    isSuperAdmin: user?.isSuperAdmin === true,
  }
}
