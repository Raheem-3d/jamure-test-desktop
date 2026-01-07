export type Permission =
  | "ORG_VIEW"
  | "ORG_EDIT"
  | "ORG_USERS_INVITE"
  | "ORG_USERS_MANAGE"
  | "ORG_DELETE"
  | "PROJECT_MANAGE"
  | "PROJECT_VIEW_ALL"
  | "PROJECT_DELETE"
  | "TASK_CREATE"
  | "TASK_EDIT"
  | "TASK_VIEW"
  | "TASK_DELETE"
  | "TASK_VIEW_ALL"
  | "CHANNEL_CREATE"
  | "CHANNEL_VIEW_ALL"
  | "CHANNEL_MANAGE"
  | "CHANNEL_DELETE"
  | "REPORTS_VIEW"
  | "SUPER_ADMIN_ACCESS"
  | "CROSS_ORG_ACCESS"

export const DefaultRolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    "SUPER_ADMIN_ACCESS",
    "CROSS_ORG_ACCESS",
    "ORG_VIEW",
    "ORG_EDIT",
    "ORG_DELETE",
    "ORG_USERS_INVITE",
    "ORG_USERS_MANAGE",
    "PROJECT_MANAGE",
    "PROJECT_VIEW_ALL",
    "PROJECT_DELETE",
    "TASK_CREATE",
    "TASK_EDIT",
    "TASK_VIEW",
    "TASK_DELETE",
    "TASK_VIEW_ALL",
    "CHANNEL_CREATE",
    "CHANNEL_VIEW_ALL",
    "CHANNEL_MANAGE",
    "CHANNEL_DELETE",
    "REPORTS_VIEW",
  ],
  ORG_ADMIN: [
    "ORG_VIEW",
    "ORG_EDIT",
    "ORG_USERS_INVITE",
    "ORG_USERS_MANAGE",
    "PROJECT_MANAGE",
    "PROJECT_VIEW_ALL",
    "TASK_CREATE",
    "TASK_EDIT",
    "TASK_VIEW",
    "TASK_VIEW_ALL",
    "TASK_DELETE",
    "CHANNEL_CREATE",
    "CHANNEL_VIEW_ALL",
    "CHANNEL_MANAGE",
    "REPORTS_VIEW",
  ],
  MANAGER: [
    "ORG_VIEW",
    "ORG_USERS_INVITE",
    "PROJECT_MANAGE",
    "TASK_CREATE",
    "TASK_EDIT",
    "TASK_VIEW",
    "CHANNEL_CREATE",
    "REPORTS_VIEW",
  ],
  EMPLOYEE: ["TASK_EDIT", "TASK_VIEW"],
  ORG_MEMBER: ["TASK_EDIT", "TASK_VIEW"],
  CLIENT: ["TASK_VIEW", "REPORTS_VIEW"],
}

export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
  isSuperAdmin?: boolean,
  userPermissions?: Permission[]
): boolean {
  // Super admins have all permissions
  if (isSuperAdmin) {
    console.log(`[hasPermission] ${permission}: SuperAdmin bypass = true`);
    return true;
  }
  
  const roleUpper = role?.toUpperCase() || "";
  const rolePerms = DefaultRolePermissions[roleUpper] || [];
  const allPerms = new Set([...(rolePerms), ...(userPermissions || [])]);
  const result = allPerms.has(permission);
  
  // 🔍 DEBUG: Log detailed permission check
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[hasPermission] ${permission}:`, {
      role,
      roleUpper,
      isSuperAdmin,
      rolePerms,
      userPermissions,
      allPerms: Array.from(allPerms),
      hasInRolePerms: rolePerms.includes(permission),
      hasInUserPerms: (userPermissions || []).includes(permission),
      result
    });
  }
  
  return result;
}

export function requirePermission(
  role: string | undefined | null,
  permission: Permission,
  isSuperAdmin?: boolean,
  userPermissions?: Permission[]
) {
  if (!hasPermission(role, permission, isSuperAdmin, userPermissions)) {
    const err: any = new Error("Forbidden: Insufficient permissions")
    err.status = 403
    throw err
  }
}

/**
 * Check if user is super admin
 */
export function checkSuperAdmin(isSuperAdmin?: boolean) {
  if (!isSuperAdmin) {
    const err: any = new Error("Forbidden: Super admin access required")
    err.status = 403
    throw err
  }
}

/**
 * Check if user is admin of their organization
 */
export function checkOrgAdmin(role: string | undefined | null) {
  if (!role) {
    const err: any = new Error("Forbidden: Authentication required")
    err.status = 403
    throw err
  }
  
  const adminRoles = ["ORG_ADMIN", "SUPER_ADMIN"]
  if (!adminRoles.includes(role.toUpperCase())) {
    const err: any = new Error("Forbidden: Organization admin access required")
    err.status = 403
    throw err
  }
}
