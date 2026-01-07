# Multi-Tenant Role-Based Access Control (RBAC) System

## Overview

This document describes the comprehensive multi-tenant RBAC system implemented in the Chat App Desktop Production application. The system ensures complete data isolation between organizations while providing super administrators with cross-organization access.

## Table of Contents

1. [Architecture](#architecture)
2. [Roles and Permissions](#roles-and-permissions)
3. [Tenant Isolation](#tenant-isolation)
4. [Super Admin Capabilities](#super-admin-capabilities)
5. [API Security](#api-security)
6. [Implementation Guide](#implementation-guide)

---

## Architecture

### Core Principles

1. **Multi-Tenancy**: Each organization operates as an independent tenant with isolated data
2. **Role-Based Access**: Users have specific roles that determine their permissions
3. **Hierarchical Access**: Super admins > Org admins > Managers > Employees > Clients
4. **Data Isolation**: Organizations cannot access each other's data
5. **Centralized Management**: Super admins can manage all organizations from a single dashboard

### Database Schema

The system uses the following key models:

- **Organization**: Independent tenant entity
- **User**: Belongs to one organization, has a role and isSuperAdmin flag
- **Task**: Scoped to an organization
- **Channel**: Scoped to an organization
- **Message**: Scoped to an organization

---

## Roles and Permissions

### Available Roles

#### 1. SUPER_ADMIN
**Global system administrator with unrestricted access**

- Can access ALL organizations' data
- Can create, read, update, and delete organizations
- Can manage users across all organizations
- Can view and modify all tasks, projects, channels
- Can suspend/activate organizations
- Access to system-wide statistics and analytics

**Permissions:**
- SUPER_ADMIN_ACCESS
- CROSS_ORG_ACCESS
- ORG_VIEW, ORG_EDIT, ORG_DELETE
- ORG_USERS_INVITE, ORG_USERS_MANAGE
- PROJECT_MANAGE, PROJECT_VIEW_ALL, PROJECT_DELETE
- TASK_CREATE, TASK_EDIT, TASK_VIEW, TASK_DELETE, TASK_VIEW_ALL
- CHANNEL_VIEW_ALL, CHANNEL_MANAGE, CHANNEL_DELETE
- REPORTS_VIEW

#### 2. ADMIN / ORG_ADMIN
**Organization administrator**

- Full access to their own organization
- Can invite and manage users within their organization
- Can create and manage all projects and tasks
- Can view all channels and tasks in their organization
- Cannot access other organizations

**Permissions:**
- ORG_VIEW, ORG_EDIT
- ORG_USERS_INVITE, ORG_USERS_MANAGE
- PROJECT_MANAGE, PROJECT_VIEW_ALL
- TASK_CREATE, TASK_EDIT, TASK_VIEW, TASK_VIEW_ALL, TASK_DELETE
- CHANNEL_VIEW_ALL, CHANNEL_MANAGE
- REPORTS_VIEW

#### 3. MANAGER
**Team manager with project oversight**

- Can invite users to their organization
- Can manage projects and tasks
- Can create and assign tasks
- Can view organization reports
- Limited to their organization's scope

**Permissions:**
- ORG_VIEW
- ORG_USERS_INVITE
- PROJECT_MANAGE
- TASK_CREATE, TASK_EDIT, TASK_VIEW
- REPORTS_VIEW

#### 4. EMPLOYEE / ORG_MEMBER
**Regular team member**

- Can create tasks
- Can edit tasks assigned to them
- Can view tasks they're involved in
- Limited to their organization

**Permissions:**
- TASK_CREATE, TASK_EDIT, TASK_VIEW

#### 5. CLIENT
**External client with read-only access**

- Can view specific tasks they're invited to
- Can view reports they have access to
- Read-only permissions

**Permissions:**
- TASK_VIEW, REPORTS_VIEW

---

## Tenant Isolation

### How It Works

Every data query automatically scopes to the user's organization unless the user is a super admin.

### Implementation

#### Helper Functions (`lib/org.ts`)

```typescript
// Get tenant-scoped where clause
await getTenantWhereClause({ /* additional filters */ })

// Assert organization access
await assertOrganizationAccess(targetOrgId)

// Get user with permissions
await getSessionUserWithPermissions()
```

#### Example Usage

```typescript
// In API route
const user = await getSessionUserWithPermissions()

// Super admins see all, others see only their org
const whereClause = user.isSuperAdmin 
  ? {} 
  : { organizationId: user.organizationId }

const tasks = await db.task.findMany({ where: whereClause })
```

### Database Scoping

All major entities have an `organizationId` field:

- **User**: Links to their organization
- **Task**: Belongs to an organization
- **Channel**: Scoped to an organization
- **Message**: Scoped to an organization
- **Project** (Task with stages): Scoped to an organization

---

## Super Admin Capabilities

### Access

Super admins are defined by:
1. `isSuperAdmin: true` in database
2. Email listed in `SUPERADMINS` environment variable

### Dashboard Features

Access via: `/superadmin`

**Overview Tab:**
- System-wide statistics
- Organization count (active/suspended)
- Total users across all organizations
- Active trials and expired trials
- Recent activity

**Organizations Tab:**
- View all organizations
- Create new organizations
- Edit organization details
- Suspend/activate organizations
- Delete organizations (with cascade)
- View organization statistics (users, channels, tasks, messages)

**Users Tab:**
- View all users across organizations
- Filter by organization
- View user activity (tasks created/assigned, messages sent)
- Edit user roles
- Delete users

**Projects Tab:**
- View all projects across organizations
- Filter by organization, status
- View project stages and members
- Monitor project progress

**Tasks Tab:**
- View all tasks across organizations
- Filter by organization, status, priority
- View assignees and deadlines
- Monitor task completion

### API Endpoints

All super admin endpoints are under `/api/superadmin/*`:

#### Organizations
- `GET /api/superadmin/organizations` - List all organizations
- `POST /api/superadmin/organizations` - Create organization
- `GET /api/superadmin/organizations/[orgId]` - Get organization details
- `PATCH /api/superadmin/organizations/[orgId]` - Update organization
- `DELETE /api/superadmin/organizations/[orgId]` - Delete organization

#### Users
- `GET /api/superadmin/users` - List all users
- `GET /api/superadmin/users/[userId]` - Get user details
- `PATCH /api/superadmin/users/[userId]` - Update user
- `DELETE /api/superadmin/users/[userId]` - Delete user

#### Tasks
- `GET /api/superadmin/tasks` - List all tasks

#### Channels
- `GET /api/superadmin/channels` - List all channels

#### Projects
- `GET /api/superadmin/projects` - List all projects

#### Stats
- `GET /api/superadmin/stats` - Get system-wide statistics

---

## API Security

### Authentication

All API routes require authentication via NextAuth session.

### Authorization Patterns

#### 1. Super Admin Only

```typescript
import { checkSuperAdmin } from "@/lib/permissions"
import { getSessionUserWithPermissions } from "@/lib/org"

const user = await getSessionUserWithPermissions()
checkSuperAdmin(user.isSuperAdmin)
```

#### 2. Org Admin Only

```typescript
import { checkOrgAdmin } from "@/lib/permissions"

const session = await getServerSession(authOptions)
checkOrgAdmin(session?.user?.role)
```

#### 3. Permission-Based

```typescript
import { requirePermission } from "@/lib/permissions"

const session = await getServerSession(authOptions)
requirePermission(session?.user?.role, "TASK_EDIT", session?.user?.isSuperAdmin)
```

#### 4. Tenant-Scoped Queries

```typescript
import { getTenantWhereClause } from "@/lib/org"

// Automatically scopes to user's org unless super admin
const whereClause = await getTenantWhereClause({ status: "ACTIVE" })
const tasks = await db.task.findMany({ where: whereClause })
```

---

## Implementation Guide

### Step 1: Set Up Super Admin

Add super admin emails to `.env`:

```env
SUPERADMINS=admin@example.com,superadmin@company.com
```

### Step 2: Update User in Database

```sql
UPDATE User 
SET isSuperAdmin = true, role = 'SUPER_ADMIN' 
WHERE email = 'admin@example.com';
```

### Step 3: Protect Routes

Update API routes to use tenant isolation:

```typescript
import { getTenantWhereClause, getSessionUserWithPermissions } from "@/lib/org"

export async function GET(req: Request) {
  const user = await getSessionUserWithPermissions()
  
  const whereClause = await getTenantWhereClause({ /* filters */ })
  const data = await db.model.findMany({ where: whereClause })
  
  return NextResponse.json(data)
}
```

### Step 4: Add Permission Checks

```typescript
import { requirePermission } from "@/lib/permissions"

const session = await getServerSession(authOptions)
const user = session?.user

// Check specific permission
requirePermission(user?.role, "TASK_EDIT", user?.isSuperAdmin)
```

### Step 5: Use Auth Context in Components

```typescript
"use client"

import { useAuth } from "@/contexts/auth-context"

export function MyComponent() {
  const { user, isSuperAdmin, isOrgAdmin, organizationId } = useAuth()
  
  if (isSuperAdmin) {
    // Show super admin features
  } else if (isOrgAdmin) {
    // Show org admin features
  }
  
  return <div>...</div>
}
```

---

## Security Best Practices

### 1. Always Validate Organization Access

```typescript
await assertOrganizationAccess(targetOrgId)
```

### 2. Use Scoped Queries

Never query without organization filtering unless super admin:

```typescript
// ❌ BAD
const tasks = await db.task.findMany()

// ✅ GOOD
const whereClause = await getTenantWhereClause()
const tasks = await db.task.findMany({ where: whereClause })
```

### 3. Check Permissions

```typescript
requirePermission(user?.role, "TASK_DELETE", user?.isSuperAdmin)
```

### 4. Validate User Context

```typescript
const user = await getSessionUserWithPermissions()
if (!user) throw new Error("Unauthorized")
```

---

## Testing

### Test Scenarios

1. **Tenant Isolation**: User A from Org 1 cannot access Org 2's data
2. **Role Permissions**: Employee cannot delete tasks, Admin can
3. **Super Admin Access**: Super admin can view all organizations
4. **Organization Admin**: Can only manage their own organization
5. **Cross-Org Prevention**: Regular users blocked from accessing other orgs

### Example Test

```typescript
// Test: Regular user cannot access other org's tasks
const org1User = await login("user1@org1.com")
const org2Tasks = await fetch("/api/tasks?organizationId=org2")
expect(org2Tasks).toHaveLength(0) // Should return empty

// Test: Super admin can access all org's tasks
const superAdmin = await login("super@admin.com")
const allTasks = await fetch("/api/superadmin/tasks")
expect(allTasks.length).toBeGreaterThan(0)
```

---

## Troubleshooting

### Issue: User can see data from other organizations

**Solution**: Ensure all API routes use `getTenantWhereClause()` or check `isSuperAdmin`

### Issue: Permission denied for valid action

**Solution**: Check role permissions in `lib/permissions.ts` and ensure user has correct role

### Issue: Super admin cannot access super admin dashboard

**Solution**: 
1. Check `SUPERADMINS` environment variable
2. Verify `isSuperAdmin` flag in database
3. Clear session and re-login

---

## Summary

This multi-tenant RBAC system provides:

✅ **Complete data isolation** between organizations  
✅ **Role-based permissions** for fine-grained access control  
✅ **Super admin access** for system-wide management  
✅ **Organization admin** capabilities for self-service  
✅ **Secure API routes** with automatic tenant scoping  
✅ **Centralized dashboard** for super admins  

All users can only access their organization's data unless they are super admins, who have unrestricted access to manage the entire system.
