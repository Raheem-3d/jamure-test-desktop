# RBAC Utils Usage Examples

## Import the utilities

```typescript
import { 
  useRole, 
  usePermissions,
  RoleGuard,
  PermissionGuard,
  SuperAdminOnly,
  OrgAdminOnly,
  getRoleDisplayName,
  getRoleBadgeVariant 
} from "@/lib/rbac-utils"
```

## Example 1: Check User Role

```typescript
"use client"

import { useRole } from "@/lib/rbac-utils"

export function MyComponent() {
  const { isSuperAdmin, isAdmin, isManager, isEmployee, role } = useRole()

  return (
    <div>
      <h1>Welcome!</h1>
      
      {isSuperAdmin && <p>You are a Super Admin</p>}
      {isAdmin && <p>You are an Admin</p>}
      {isManager && <p>You are a Manager</p>}
      {isEmployee && <p>You are an Employee</p>}
      
      <p>Your role: {role}</p>
    </div>
  )
}
```

## Example 2: Check Permissions

```typescript
"use client"

import { usePermissions } from "@/lib/rbac-utils"
import { Button } from "@/components/ui/button"

export function TaskActions() {
  const {
    canCreateTasks,
    canEditTasks,
    canDeleteTasks,
    canViewAllTasks
  } = usePermissions()

  return (
    <div className="flex gap-2">
      {canCreateTasks && (
        <Button>Create Task</Button>
      )}
      
      {canEditTasks && (
        <Button variant="outline">Edit</Button>
      )}
      
      {canDeleteTasks && (
        <Button variant="destructive">Delete</Button>
      )}
      
      {canViewAllTasks && (
        <Button variant="secondary">View All Tasks</Button>
      )}
    </div>
  )
}
```

## Example 3: Role-Based Rendering with RoleGuard

```typescript
"use client"

import { RoleGuard } from "@/lib/rbac-utils"
import { AdminPanel } from "@/components/admin-panel"
import { ManagerPanel } from "@/components/manager-panel"

export function DashboardContent() {
  return (
    <div>
      {/* Only shown to Super Admins and Admins */}
      <RoleGuard roles={["SUPER_ADMIN", "ADMIN", "ORG_ADMIN"]}>
        <AdminPanel />
      </RoleGuard>

      {/* Only shown to Managers */}
      <RoleGuard 
        roles={["MANAGER"]}
        fallback={<p>You don't have manager access</p>}
      >
        <ManagerPanel />
      </RoleGuard>
    </div>
  )
}
```

## Example 4: Permission-Based Rendering

```typescript
"use client"

import { PermissionGuard } from "@/lib/rbac-utils"
import { UserManagement } from "@/components/user-management"
import { Alert } from "@/components/ui/alert"

export function SettingsPage() {
  return (
    <div>
      <PermissionGuard 
        permission="canManageUsers"
        fallback={
          <Alert>You don't have permission to manage users</Alert>
        }
      >
        <UserManagement />
      </PermissionGuard>

      <PermissionGuard permission="canEditOrg">
        <h2>Organization Settings</h2>
        {/* Organization edit form */}
      </PermissionGuard>
    </div>
  )
}
```

## Example 5: Super Admin Only Content

```typescript
"use client"

import { SuperAdminOnly } from "@/lib/rbac-utils"
import { SystemSettings } from "@/components/system-settings"

export function AdvancedSettings() {
  return (
    <div>
      <h1>Settings</h1>
      
      <SuperAdminOnly fallback={<p>Super admin access required</p>}>
        <SystemSettings />
        <button>Manage All Organizations</button>
      </SuperAdminOnly>
    </div>
  )
}
```

## Example 6: Org Admin Only Content

```typescript
"use client"

import { OrgAdminOnly } from "@/lib/rbac-utils"
import { OrganizationSettings } from "@/components/org-settings"

export function OrganizationPage() {
  return (
    <div>
      <OrgAdminOnly>
        <OrganizationSettings />
      </OrgAdminOnly>
      
      {/* Regular content for all users */}
      <div>General organization info</div>
    </div>
  )
}
```

## Example 7: Display Role Badges

```typescript
"use client"

import { useAuth } from "@/contexts/auth-context"
import { getRoleDisplayName, getRoleBadgeVariant } from "@/lib/rbac-utils"
import { Badge } from "@/components/ui/badge"

export function UserCard({ user }: { user: any }) {
  return (
    <div className="flex items-center gap-2">
      <span>{user.name}</span>
      <Badge variant={getRoleBadgeVariant(user.role)}>
        {getRoleDisplayName(user.role)}
      </Badge>
    </div>
  )
}
```

## Example 8: Navigation with Role Checks

```typescript
"use client"

import { useRole, usePermissions } from "@/lib/rbac-utils"
import Link from "next/link"

export function Navigation() {
  const { isSuperAdmin, isAdmin } = useRole()
  const { canManageUsers, canViewReports } = usePermissions()

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/tasks">Tasks</Link>
      
      {canViewReports && (
        <Link href="/reports">Reports</Link>
      )}
      
      {canManageUsers && (
        <Link href="/users">User Management</Link>
      )}
      
      {isAdmin && (
        <Link href="/settings">Organization Settings</Link>
      )}
      
      {isSuperAdmin && (
        <Link href="/superadmin">Super Admin Dashboard</Link>
      )}
    </nav>
  )
}
```

## Example 9: Conditional Button Actions

```typescript
"use client"

import { usePermissions } from "@/lib/rbac-utils"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"

export function TaskRowActions({ taskId }: { taskId: string }) {
  const { canEditTasks, canDeleteTasks } = usePermissions()

  const handleDelete = async () => {
    if (!canDeleteTasks) {
      alert("You don't have permission to delete tasks")
      return
    }
    // Delete logic
  }

  const handleEdit = async () => {
    if (!canEditTasks) {
      alert("You don't have permission to edit tasks")
      return
    }
    // Edit logic
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline">
        <Eye className="h-4 w-4" />
      </Button>
      
      {canEditTasks && (
        <Button size="sm" variant="outline" onClick={handleEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      )}
      
      {canDeleteTasks && (
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

## Example 10: Complex Permission Logic

```typescript
"use client"

import { useAuth } from "@/contexts/auth-context"
import { usePermissions, useRole } from "@/lib/rbac-utils"

export function TaskDetailPage({ task }: { task: any }) {
  const { user } = useAuth()
  const { isSuperAdmin } = useRole()
  const { canEditTasks, canDeleteTasks, canViewAllTasks } = usePermissions()

  // User can edit if:
  // 1. They're super admin, OR
  // 2. They have edit permission AND (they created it OR are assigned to it)
  const canEdit = 
    isSuperAdmin || 
    (canEditTasks && (task.creatorId === user?.id || task.assignees.includes(user?.id)))

  // User can delete if:
  // 1. They're super admin, OR
  // 2. They have delete permission AND created it
  const canDelete = 
    isSuperAdmin || 
    (canDeleteTasks && task.creatorId === user?.id)

  return (
    <div>
      <h1>{task.title}</h1>
      <p>{task.description}</p>

      <div className="flex gap-2 mt-4">
        {canEdit && <Button>Edit Task</Button>}
        {canDelete && <Button variant="destructive">Delete Task</Button>}
      </div>
    </div>
  )
}
```

## Example 11: Full Page with Multiple Guards

```typescript
"use client"

import { SuperAdminOnly, OrgAdminOnly, PermissionGuard } from "@/lib/rbac-utils"
import { Card } from "@/components/ui/card"

export function SettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1>Settings</h1>

      {/* Super Admin Section */}
      <SuperAdminOnly>
        <Card className="p-6">
          <h2>System Administration</h2>
          <p>Manage all organizations, users, and system settings</p>
          <button>Go to Super Admin Dashboard</button>
        </Card>
      </SuperAdminOnly>

      {/* Organization Admin Section */}
      <OrgAdminOnly>
        <Card className="p-6">
          <h2>Organization Administration</h2>
          <PermissionGuard permission="canManageUsers">
            <button>Manage Users</button>
          </PermissionGuard>
          <PermissionGuard permission="canEditOrg">
            <button>Edit Organization</button>
          </PermissionGuard>
        </Card>
      </OrgAdminOnly>

      {/* User Settings (Available to all) */}
      <Card className="p-6">
        <h2>User Settings</h2>
        <p>Update your profile and preferences</p>
      </Card>
    </div>
  )
}
```

## Available Permissions

From `usePermissions()`:
- `canViewAllOrgs` - View all organizations (super admin only)
- `canEditOrg` - Edit organization settings
- `canDeleteOrg` - Delete organizations (super admin only)
- `canManageUsers` - Full user management
- `canInviteUsers` - Invite new users
- `canViewAllTasks` - View all tasks in organization
- `canCreateTasks` - Create new tasks
- `canEditTasks` - Edit tasks
- `canDeleteTasks` - Delete tasks
- `canViewAllChannels` - View all channels
- `canManageChannels` - Create/edit channels
- `canDeleteChannels` - Delete channels (super admin only)
- `canManageProjects` - Manage projects
- `canViewReports` - View reports

## Best Practices

1. **Use Permission Guards for UI**: Hide/show features based on permissions
2. **Validate on Backend**: Always validate permissions in API routes
3. **Provide Feedback**: Show appropriate messages when users lack permissions
4. **Use Fallbacks**: Provide fallback content when permission denied
5. **Combine Guards**: Use multiple guards for complex permission logic
