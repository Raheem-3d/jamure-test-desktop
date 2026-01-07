# Role-Based Access Control (RBAC) Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for granular role-based access control (RBAC) with three primary roles: **Admin (ORG_ADMIN)**, **Manager**, and **Employee**. The system enforces permission-based access at both the UI and API levels.

### Key Requirements
- **Employees** CANNOT create tasks or channels by default
- **Admin** and **Manager** CAN create tasks and channels by default
- **Admin** can grant/revoke granular permissions to Employees
- Permission enforcement at both frontend (UI) and backend (API) layers
- Consistent behavior across sidebar, dashboard, and calendar views

---

## 1. Database Schema

### 1.1 Current Schema Analysis

The existing `User` model already includes:
- `role` field (Role enum: SUPER_ADMIN, ORG_ADMIN, MANAGER, EMPLOYEE, CLIENT)
- `permissions` field (JSON array for explicit per-user permissions)
- `isSuperAdmin` boolean flag

### 1.2 Required Schema Updates

#### Add Missing Permission Types

Update `lib/permissions.ts` to include channel creation permissions:

```typescript
export type Permission =
  | "ORG_VIEW"
  | "ORG_EDIT"
  | "ORG_USERS_INVITE"
  | "ORG_USERS_MANAGE"
  | "ORG_DELETE"
  | "PROJECT_MANAGE"
  | "PROJECT_VIEW_ALL"
  | "PROJECT_DELETE"
  | "TASK_CREATE"           // ✅ Already exists
  | "TASK_EDIT"
  | "TASK_VIEW"
  | "TASK_DELETE"
  | "TASK_VIEW_ALL"
  | "CHANNEL_CREATE"        // 🆕 ADD THIS
  | "CHANNEL_VIEW_ALL"
  | "CHANNEL_MANAGE"
  | "CHANNEL_DELETE"
  | "REPORTS_VIEW"
  | "SUPER_ADMIN_ACCESS"
  | "CROSS_ORG_ACCESS"
```

#### Update Default Role Permissions

```typescript
export const DefaultRolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    "SUPER_ADMIN_ACCESS",
    "CROSS_ORG_ACCESS",
    // ... all permissions
  ],
  
  ORG_ADMIN: [
    "ORG_VIEW",
    "ORG_EDIT",
    "ORG_USERS_INVITE",
    "ORG_USERS_MANAGE",
    "PROJECT_MANAGE",
    "PROJECT_VIEW_ALL",
    "TASK_CREATE",          // ✅ Can create tasks
    "TASK_EDIT",
    "TASK_VIEW",
    "TASK_VIEW_ALL",
    "TASK_DELETE",
    "CHANNEL_CREATE",       // ✅ Can create channels
    "CHANNEL_VIEW_ALL",
    "CHANNEL_MANAGE",
    "REPORTS_VIEW",
  ],
  
  MANAGER: [
    "ORG_VIEW",
    "ORG_USERS_INVITE",
    "PROJECT_MANAGE",
    "TASK_CREATE",          // ✅ Can create tasks
    "TASK_EDIT",
    "TASK_VIEW",
    "CHANNEL_CREATE",       // ✅ Can create channels
    "REPORTS_VIEW",
  ],
  
  EMPLOYEE: [
    // ❌ NO TASK_CREATE by default
    // ❌ NO CHANNEL_CREATE by default
    "TASK_EDIT",            // Can edit assigned tasks
    "TASK_VIEW",            // Can view tasks
  ],
  
  CLIENT: [
    "TASK_VIEW",
    "REPORTS_VIEW"
  ],
}
```

### 1.3 Sample Database Rows

#### Users Table
```sql
-- Admin User (full permissions)
INSERT INTO User (id, email, name, role, permissions, organizationId, isSuperAdmin) 
VALUES (
  'usr_admin_001', 
  'admin@company.com', 
  'John Admin',
  'ORG_ADMIN',
  '[]',  -- Inherits from DefaultRolePermissions
  'org_001',
  false
);

-- Manager User (can create tasks/channels)
INSERT INTO User (id, email, name, role, permissions, organizationId, isSuperAdmin) 
VALUES (
  'usr_mgr_001', 
  'manager@company.com', 
  'Jane Manager',
  'MANAGER',
  '[]',  -- Inherits from DefaultRolePermissions
  'org_001',
  false
);

-- Employee with NO extra permissions (default restricted)
INSERT INTO User (id, email, name, role, permissions, organizationId, isSuperAdmin) 
VALUES (
  'usr_emp_001', 
  'employee@company.com', 
  'Bob Employee',
  'EMPLOYEE',
  '[]',  -- No task/channel creation
  'org_001',
  false
);

-- Employee with GRANTED task creation permission
INSERT INTO User (id, email, name, role, permissions, organizationId, isSuperAdmin) 
VALUES (
  'usr_emp_002', 
  'employee2@company.com', 
  'Alice Employee',
  'EMPLOYEE',
  '["TASK_CREATE"]',  -- Admin granted this permission
  'org_001',
  false
);

-- Employee with BOTH task and channel creation
INSERT INTO User (id, email, name, role, permissions, organizationId, isSuperAdmin) 
VALUES (
  'usr_emp_003', 
  'employee3@company.com', 
  'Charlie Employee',
  'EMPLOYEE',
  '["TASK_CREATE", "CHANNEL_CREATE"]',  -- Admin granted both
  'org_001',
  false
);
```

---

## 2. Backend API Endpoints & Middleware

### 2.1 Permission Middleware Enhancement

File: `lib/permissions.ts`

```typescript
/**
 * Enhanced permission checker with user-specific permissions support
 */
export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
  isSuperAdmin?: boolean,
  userPermissions?: Permission[]
): boolean {
  // Super admins bypass all checks
  if (isSuperAdmin) return true;
  
  // Get default role permissions
  const rolePerms = DefaultRolePermissions[role?.toUpperCase() || ""] || [];
  
  // Merge role permissions with explicit user permissions
  const allPerms = new Set([...rolePerms, ...(userPermissions || [])]);
  
  return allPerms.has(permission);
}

/**
 * Require permission or throw 403 error
 */
export function requirePermission(
  role: string | undefined | null,
  permission: Permission,
  isSuperAdmin?: boolean,
  userPermissions?: Permission[]
) {
  if (!hasPermission(role, permission, isSuperAdmin, userPermissions)) {
    const err: any = new Error(`Forbidden: Missing permission ${permission}`)
    err.status = 403
    throw err
  }
}

/**
 * Middleware helper to get user with resolved permissions
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { permissions: true }
  });
  
  if (!user || !user.permissions) return [];
  
  try {
    const parsed = JSON.parse(String(user.permissions));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

### 2.2 Task Creation API Protection

File: `app/api/tasks/route.ts`

```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { requirePermission } from "@/lib/permissions"

export async function POST(req: Request) {
  try {
    // Get authenticated user with permissions
    const user = await getSessionUserWithPermissions();
    
    // Parse user's explicit permissions from DB
    let userPerms: any[] = [];
    try {
      userPerms = JSON.parse(String(user.permissions || '[]'));
    } catch {}
    
    // ✅ ENFORCE PERMISSION: TASK_CREATE required
    requirePermission(
      user.role, 
      'TASK_CREATE', 
      user.isSuperAdmin, 
      userPerms
    );
    
    const body = await req.json();
    const { title, description, priority, deadline, assigneeIds } = body;
    
    if (!title) {
      return NextResponse.json(
        { message: "Title is required" }, 
        { status: 400 }
      );
    }
    
    // Create task
    const task = await db.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
        creatorId: user.id,
        organizationId: user.organizationId,
        assignments: assigneeIds?.length ? {
          create: assigneeIds.map((userId: string) => ({ userId }))
        } : undefined
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: { include: { user: true } }
      }
    });
    
    return NextResponse.json(task, { status: 201 });
    
  } catch (error: any) {
    console.error('Task creation error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create task' },
      { status: error.status || 500 }
    );
  }
}
```

### 2.3 Channel Creation API Protection

File: `app/api/channels/route.ts`

```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { requirePermission } from "@/lib/permissions"

export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions();
    
    // Parse user permissions
    let userPerms: any[] = [];
    try {
      userPerms = JSON.parse(String(user.permissions || '[]'));
    } catch {}
    
    // ✅ ENFORCE PERMISSION: CHANNEL_CREATE required
    requirePermission(
      user.role, 
      'CHANNEL_CREATE', 
      user.isSuperAdmin, 
      userPerms
    );
    
    const body = await req.json();
    const { name, description, isPublic, departmentId } = body;
    
    if (!name) {
      return NextResponse.json(
        { message: "Channel name is required" }, 
        { status: 400 }
      );
    }
    
    const channel = await db.channel.create({
      data: {
        name,
        description,
        isPublic: isPublic !== false,
        creatorId: user.id,
        organizationId: user.organizationId,
        departmentId: departmentId || null,
        members: {
          create: [{ userId: user.id, isAdmin: true }]
        }
      },
      include: {
        creator: { select: { id: true, name: true } },
        members: { include: { user: true } }
      }
    });
    
    return NextResponse.json(channel, { status: 201 });
    
  } catch (error: any) {
    console.error('Channel creation error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create channel' },
      { status: error.status || 500 }
    );
  }
}
```

### 2.4 Permission Management API (Admin Only)

File: `app/api/org-admin/users/[userId]/permissions/route.ts`

```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkOrgAdmin, requirePermission } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"

// GET - Retrieve user's permissions
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await getSessionUserWithPermissions();
    checkOrgAdmin(admin.role);
    
    const targetUser = await db.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        organizationId: true
      }
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Ensure same organization
    if (targetUser.organizationId !== admin.organizationId) {
      return NextResponse.json(
        { message: "Cannot view users from other organizations" },
        { status: 403 }
      );
    }
    
    let userPerms: Permission[] = [];
    try {
      userPerms = JSON.parse(String(targetUser.permissions || '[]'));
    } catch {}
    
    return NextResponse.json({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      permissions: userPerms
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve permissions' },
      { status: error.status || 500 }
    );
  }
}

// PATCH - Update user's permissions (Admin only)
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await getSessionUserWithPermissions();
    checkOrgAdmin(admin.role);
    requirePermission(admin.role, 'ORG_USERS_MANAGE', admin.isSuperAdmin);
    
    const body = await req.json();
    const { permissions } = body;
    
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { message: "Permissions must be an array" },
        { status: 400 }
      );
    }
    
    // Validate permissions - prevent granting super-admin or cross-org
    const ALLOWED_PERMISSIONS: Permission[] = [
      "TASK_CREATE",
      "TASK_EDIT",
      "TASK_VIEW",
      "TASK_DELETE",
      "TASK_VIEW_ALL",
      "CHANNEL_CREATE",
      "CHANNEL_VIEW_ALL",
      "CHANNEL_MANAGE",
      "CHANNEL_DELETE",
    ];
    
    const invalid = permissions.filter(p => !ALLOWED_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
      return NextResponse.json(
        { message: `Invalid permissions: ${invalid.join(', ')}` },
        { status: 400 }
      );
    }
    
    const targetUser = await db.user.findUnique({
      where: { id: params.userId },
      select: { organizationId: true, role: true }
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Ensure same organization
    if (targetUser.organizationId !== admin.organizationId) {
      return NextResponse.json(
        { message: "Cannot modify users from other organizations" },
        { status: 403 }
      );
    }
    
    // Prevent modifying permissions of other admins
    if (targetUser.role === 'ORG_ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: "Cannot modify admin permissions" },
        { status: 403 }
      );
    }
    
    // Update permissions
    const updated = await db.user.update({
      where: { id: params.userId },
      data: {
        permissions: JSON.stringify(permissions)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true
      }
    });
    
    return NextResponse.json({
      message: "Permissions updated successfully",
      user: updated
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to update permissions' },
      { status: error.status || 500 }
    );
  }
}
```

---

## 3. Frontend Implementation

### 3.1 Permission Hook

File: `hooks/usePermissions.ts`

```typescript
"use client"
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { DefaultRolePermissions, hasPermission, type Permission } from "@/lib/permissions"

export function usePermissions() {
  const { data: session } = useSession();
  const user = session?.user;
  
  const userPermissions = useMemo(() => {
    if (!user?.permissions) return [];
    try {
      const parsed = JSON.parse(String(user.permissions));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [user?.permissions]);
  
  const can = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(
      user.role,
      permission,
      user.isSuperAdmin,
      userPermissions
    );
  };
  
  const canCreateTask = can('TASK_CREATE');
  const canCreateChannel = can('CHANNEL_CREATE');
  const canManageUsers = can('ORG_USERS_MANAGE');
  const canViewAllTasks = can('TASK_VIEW_ALL');
  
  return {
    can,
    canCreateTask,
    canCreateChannel,
    canManageUsers,
    canViewAllTasks,
    userPermissions,
    role: user?.role,
    isAdmin: user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN',
    isManager: user?.role === 'MANAGER',
    isEmployee: user?.role === 'EMPLOYEE',
  };
}
```

### 3.2 Protected Button Component

File: `components/ui/protected-button.tsx`

```typescript
"use client"
import { usePermissions } from "@/hooks/usePermissions"
import { Button, type ButtonProps } from "@/components/ui/button"
import type { Permission } from "@/lib/permissions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProtectedButtonProps extends ButtonProps {
  permission: Permission;
  fallbackMessage?: string;
  hideIfNoAccess?: boolean;
}

export function ProtectedButton({
  permission,
  fallbackMessage = "You don't have permission to perform this action",
  hideIfNoAccess = false,
  children,
  ...props
}: ProtectedButtonProps) {
  const { can } = usePermissions();
  const hasAccess = can(permission);
  
  if (!hasAccess && hideIfNoAccess) {
    return null;
  }
  
  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button {...props} disabled className="pointer-events-auto">
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{fallbackMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return <Button {...props}>{children}</Button>;
}
```

### 3.3 Sidebar with Permission Checks

File: `components/sidebar.tsx` (Update existing)

```typescript
"use client"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export function Sidebar() {
  const { canCreateTask, canCreateChannel } = usePermissions();
  
  return (
    <aside className="w-64 border-r h-full">
      <div className="p-4 space-y-4">
        
        {/* Task Creation - Only if user has permission */}
        {canCreateTask && (
          <Button 
            asChild 
            className="w-full"
            variant="default"
          >
            <Link href="/dashboard/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Link>
          </Button>
        )}
        
        {/* Channel Creation - Only if user has permission */}
        {canCreateChannel && (
          <Button 
            asChild 
            className="w-full"
            variant="outline"
          >
            <Link href="/dashboard/channels/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
            </Link>
          </Button>
        )}
        
        {/* Navigation Links */}
        <nav className="space-y-2">
          <Link href="/dashboard" className="block p-2 hover:bg-gray-100 rounded">
            Dashboard
          </Link>
          <Link href="/dashboard/tasks" className="block p-2 hover:bg-gray-100 rounded">
            Tasks
          </Link>
          <Link href="/dashboard/channels" className="block p-2 hover:bg-gray-100 rounded">
            Channels
          </Link>
          <Link href="/dashboard/calendar" className="block p-2 hover:bg-gray-100 rounded">
            Calendar
          </Link>
        </nav>
      </div>
    </aside>
  );
}
```

### 3.4 Dashboard with Conditional Rendering

File: `components/dashboard-charts.tsx` (Update existing)

```typescript
"use client"
import { usePermissions } from "@/hooks/usePermissions"
import { ProtectedButton } from "@/components/ui/protected-button"
import { Plus } from "lucide-react"

export function DashboardCharts() {
  const { canCreateTask, canCreateChannel } = usePermissions();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <div className="flex gap-2">
          {/* Show create buttons based on permissions */}
          <ProtectedButton
            permission="TASK_CREATE"
            variant="default"
            onClick={() => window.location.href = '/dashboard/tasks/new'}
            fallbackMessage="Only Admins and Managers (or Employees with granted permission) can create tasks"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </ProtectedButton>
          
          <ProtectedButton
            permission="CHANNEL_CREATE"
            variant="outline"
            onClick={() => window.location.href = '/dashboard/channels/new'}
            fallbackMessage="Only Admins and Managers (or Employees with granted permission) can create channels"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Channel
          </ProtectedButton>
        </div>
      </div>
      
      {/* Dashboard content */}
    </div>
  );
}
```

### 3.5 Calendar View with Permission Gates

File: `components/task-calendar.tsx`

```typescript
"use client"
import { usePermissions } from "@/hooks/usePermissions"
import { ProtectedButton } from "@/components/ui/protected-button"
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"

export function TaskCalendar() {
  const { canCreateTask } = usePermissions();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    
    // Only allow task creation if user has permission
    if (canCreateTask) {
      // Open task creation modal with pre-filled date
      // ... your logic
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Task Calendar</h2>
        
        {/* Quick create button */}
        <ProtectedButton
          permission="TASK_CREATE"
          size="sm"
          onClick={() => {
            // Open task creation modal
          }}
          fallbackMessage="You need TASK_CREATE permission to add tasks"
        >
          Add Task
        </ProtectedButton>
      </div>
      
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        className="rounded-md border"
      />
      
      {/* Task list for selected date */}
    </div>
  );
}
```

### 3.6 Permission Management UI (Admin)

File: `components/user-permissions-manager.tsx`

```typescript
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Permission } from "@/lib/permissions"

interface UserPermissionsManagerProps {
  userId: string;
  currentPermissions: Permission[];
  userName: string;
}

const GRANTABLE_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { 
    key: "TASK_CREATE", 
    label: "Create Tasks", 
    description: "Allow user to create new tasks" 
  },
  { 
    key: "TASK_DELETE", 
    label: "Delete Tasks", 
    description: "Allow user to delete tasks" 
  },
  { 
    key: "TASK_VIEW_ALL", 
    label: "View All Tasks", 
    description: "View all organization tasks" 
  },
  { 
    key: "CHANNEL_CREATE", 
    label: "Create Channels", 
    description: "Allow user to create new channels" 
  },
  { 
    key: "CHANNEL_MANAGE", 
    label: "Manage Channels", 
    description: "Edit channel settings and members" 
  },
  { 
    key: "CHANNEL_DELETE", 
    label: "Delete Channels", 
    description: "Allow user to delete channels" 
  },
];

export function UserPermissionsManager({
  userId,
  currentPermissions,
  userName
}: UserPermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>(currentPermissions);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const handleToggle = (perm: Permission) => {
    setPermissions(prev => 
      prev.includes(perm) 
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };
  
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch(`/api/org-admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update permissions');
      }
      
      setMessage({ type: 'success', text: 'Permissions updated successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Permissions: {userName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {GRANTABLE_PERMISSIONS.map(perm => (
            <div key={perm.key} className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox
                id={perm.key}
                checked={permissions.includes(perm.key)}
                onCheckedChange={() => handleToggle(perm.key)}
              />
              <div className="flex-1">
                <label 
                  htmlFor={perm.key} 
                  className="text-sm font-medium cursor-pointer"
                >
                  {perm.label}
                </label>
                <p className="text-xs text-gray-500">{perm.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        {message && (
          <div className={`p-3 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}
        
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Permissions'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 4. Acceptance Tests

### 4.1 Backend API Tests

File: `tests/api/permissions.test.ts`

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('RBAC Permission Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let employeeWithPermToken: string;
  
  beforeAll(async () => {
    // Setup: Create test users and get auth tokens
    // adminToken = await createUserAndLogin('admin@test.com', 'ORG_ADMIN');
    // managerToken = await createUserAndLogin('manager@test.com', 'MANAGER');
    // employeeToken = await createUserAndLogin('employee@test.com', 'EMPLOYEE', []);
    // employeeWithPermToken = await createUserAndLogin('employee2@test.com', 'EMPLOYEE', ['TASK_CREATE']);
  });
  
  describe('Task Creation Permissions', () => {
    it('should allow Admin to create tasks', async () => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Admin Task',
          description: 'Created by admin'
        })
      });
      
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.title).toBe('Admin Task');
    });
    
    it('should allow Manager to create tasks', async () => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Manager Task'
        })
      });
      
      expect(res.status).toBe(201);
    });
    
    it('should DENY Employee without permission from creating tasks', async () => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Employee Task'
        })
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toContain('TASK_CREATE');
    });
    
    it('should ALLOW Employee WITH granted permission to create tasks', async () => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeWithPermToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Authorized Employee Task'
        })
      });
      
      expect(res.status).toBe(201);
    });
  });
  
  describe('Channel Creation Permissions', () => {
    it('should allow Admin to create channels', async () => {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Admin Channel',
          isPublic: true
        })
      });
      
      expect(res.status).toBe(201);
    });
    
    it('should DENY Employee without permission from creating channels', async () => {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Employee Channel'
        })
      });
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('Permission Management', () => {
    it('should allow Admin to grant permissions to Employee', async () => {
      const res = await fetch('/api/org-admin/users/emp_001/permissions', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: ['TASK_CREATE', 'CHANNEL_CREATE']
        })
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('updated');
    });
    
    it('should DENY Employee from granting permissions', async () => {
      const res = await fetch('/api/org-admin/users/emp_002/permissions', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: ['TASK_CREATE']
        })
      });
      
      expect(res.status).toBe(403);
    });
  });
});
```

### 4.2 Frontend UI Tests

File: `tests/components/permissions-ui.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { Sidebar } from '@/components/sidebar';
import { DashboardCharts } from '@/components/dashboard-charts';

describe('UI Permission Rendering', () => {
  it('should show create buttons for Admin', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'admin@test.com',
        role: 'ORG_ADMIN',
        permissions: '[]',
        isSuperAdmin: false
      }
    };
    
    render(
      <SessionProvider session={mockSession}>
        <Sidebar />
      </SessionProvider>
    );
    
    expect(screen.getByText('Create Task')).toBeInTheDocument();
    expect(screen.getByText('Create Channel')).toBeInTheDocument();
  });
  
  it('should HIDE create buttons for Employee without permissions', () => {
    const mockSession = {
      user: {
        id: '2',
        email: 'employee@test.com',
        role: 'EMPLOYEE',
        permissions: '[]',
        isSuperAdmin: false
      }
    };
    
    render(
      <SessionProvider session={mockSession}>
        <Sidebar />
      </SessionProvider>
    );
    
    expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Channel')).not.toBeInTheDocument();
  });
  
  it('should SHOW create task button for Employee WITH granted permission', () => {
    const mockSession = {
      user: {
        id: '3',
        email: 'employee2@test.com',
        role: 'EMPLOYEE',
        permissions: '["TASK_CREATE"]',
        isSuperAdmin: false
      }
    };
    
    render(
      <SessionProvider session={mockSession}>
        <Sidebar />
      </SessionProvider>
    );
    
    expect(screen.getByText('Create Task')).toBeInTheDocument();
    expect(screen.queryByText('Create Channel')).not.toBeInTheDocument();
  });
});
```

---

## 5. Implementation Checklist

### Phase 1: Backend Setup
- [ ] Update `lib/permissions.ts` with `CHANNEL_CREATE` permission
- [ ] Update `DefaultRolePermissions` to reflect requirements (Employees get NO create perms)
- [ ] Create API route: `app/api/tasks/route.ts` with permission check
- [ ] Create API route: `app/api/channels/route.ts` with permission check
- [ ] Create API route: `app/api/org-admin/users/[userId]/permissions/route.ts`
- [ ] Test all API endpoints with different roles

### Phase 2: Frontend Hooks & Components
- [ ] Create `hooks/usePermissions.ts` hook
- [ ] Create `components/ui/protected-button.tsx` component
- [ ] Update `components/sidebar.tsx` with permission gates
- [ ] Update `components/dashboard-charts.tsx` with permission checks
- [ ] Update calendar component with permission checks
- [ ] Create `components/user-permissions-manager.tsx` for admin UI

### Phase 3: UI Integration
- [ ] Add permission checks to all task creation entry points
- [ ] Add permission checks to all channel creation entry points
- [ ] Ensure consistency across sidebar, dashboard, calendar views
- [ ] Add admin permission management page

### Phase 4: Testing
- [ ] Write backend API tests
- [ ] Write frontend component tests
- [ ] Manual testing: Admin creates task ✅
- [ ] Manual testing: Manager creates task ✅
- [ ] Manual testing: Employee creates task ❌ (should fail)
- [ ] Manual testing: Admin grants permission to Employee
- [ ] Manual testing: Employee with permission creates task ✅
- [ ] Manual testing: Permission changes reflect immediately in UI

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Create user guide for admins
- [ ] Create changelog entry

---

## 6. Migration Steps

### Step 1: Update Permission Types
```bash
# Update lib/permissions.ts with new permission types
```

### Step 2: Database Migration (if needed)
```bash
# No schema changes required - permissions field already exists as JSON
# Just ensure existing users have proper default permissions
npx prisma db push
```

### Step 3: Seed Default Permissions
```typescript
// scripts/seed-permissions.ts
import { db } from '@/lib/db';

async function seedPermissions() {
  // Update all existing Employees to have empty permissions array
  await db.user.updateMany({
    where: { role: 'EMPLOYEE' },
    data: { permissions: '[]' }
  });
  
  console.log('✅ Permissions seeded');
}

seedPermissions();
```

### Step 4: Deploy Backend Changes
```bash
npm run build
npm run deploy
```

### Step 5: Deploy Frontend Changes
```bash
# Deploy Next.js app
```

---

## 7. Security Considerations

1. **Always check permissions on the backend** - Frontend is only for UX
2. **Never trust client-side permission checks** - API must enforce
3. **Validate permission arrays** - Prevent injection of invalid permissions
4. **Audit logs** - Track permission grants/revocations in ActivityLog
5. **Rate limiting** - Prevent permission enumeration attacks
6. **Session invalidation** - Force re-login after permission changes (optional)

---

## 8. Troubleshooting

### Common Issues

**Issue**: Employee can still see create buttons
- **Solution**: Clear browser cache and session storage

**Issue**: Permission changes don't reflect immediately
- **Solution**: Implement real-time permission sync with WebSocket or polling

**Issue**: API returns 403 even with permission
- **Solution**: Check if `permissions` field is properly parsed from JSON

---

## 9. Future Enhancements

1. **Role Templates**: Pre-defined permission sets (e.g., "Project Lead" template)
2. **Time-based Permissions**: Grant permissions with expiration dates
3. **Resource-specific Permissions**: Permission to edit only certain tasks/channels
4. **Permission Inheritance**: Permissions based on department or team
5. **Audit Trail**: Detailed logs of who granted/revoked what and when

---

## Conclusion

This implementation provides a robust, secure, and scalable RBAC system that:
- ✅ Restricts Employees by default
- ✅ Allows Admins and Managers to create freely
- ✅ Enables granular permission grants by Admins
- ✅ Enforces permissions at both UI and API layers
- ✅ Provides comprehensive testing coverage

**Next Steps**: Begin with Phase 1 (Backend Setup) and proceed systematically through each phase.
