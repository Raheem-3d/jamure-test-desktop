# RBAC Quick Start Guide

## Overview
This guide provides step-by-step instructions to implement Role-Based Access Control (RBAC) in your application.

## Requirements Met ✅

- ✅ Employees CANNOT create tasks or channels by default
- ✅ Admin and Manager CAN create tasks and channels
- ✅ Admin can grant/revoke granular permissions to Employees
- ✅ Frontend UI shows/hides buttons based on permissions
- ✅ Backend API enforces permissions on all endpoints

---

## Quick Implementation Steps

### Step 1: Update Permission Types (5 minutes)

The permission system has been updated in `lib/permissions.ts`:

**New Permission Added:**
- `CHANNEL_CREATE` - Allows creating channels

**Updated Default Role Permissions:**
```typescript
ORG_ADMIN: [..., "TASK_CREATE", "CHANNEL_CREATE", ...]
MANAGER: [..., "TASK_CREATE", "CHANNEL_CREATE", ...]
EMPLOYEE: ["TASK_EDIT", "TASK_VIEW"]  // ❌ NO create permissions
```

### Step 2: Verify Database Schema (Already Done ✅)

Your `User` model already has the required fields:
- `role` (Role enum)
- `permissions` (JSON array)
- `isSuperAdmin` (Boolean)

No migration needed! 🎉

### Step 3: Use Permission Checks in Frontend

#### Import the hook:
```tsx
import { usePermissions } from "@/hooks/usePermissions"
```

#### Use in components:
```tsx
function MyComponent() {
  const { canCreateTask, canCreateChannel } = usePermissions()
  
  return (
    <div>
      {canCreateTask && <Button>Create Task</Button>}
      {canCreateChannel && <Button>Create Channel</Button>}
    </div>
  )
}
```

#### Use ProtectedButton component:
```tsx
import { ProtectedButton } from "@/components/ui/protected-button"

<ProtectedButton
  permission="TASK_CREATE"
  onClick={handleCreateTask}
  fallbackMessage="Only Admins, Managers, or Employees with granted permission can create tasks"
>
  Create Task
</ProtectedButton>
```

### Step 4: Protect API Endpoints

#### Example for task creation:
```typescript
import { requirePermission } from "@/lib/permissions"
import { getSessionUserWithPermissions } from "@/lib/org"

export async function POST(req: Request) {
  const user = await getSessionUserWithPermissions()
  
  // Parse user permissions
  let userPerms: any[] = []
  try {
    userPerms = JSON.parse(String(user.permissions || '[]'))
  } catch {}
  
  // ✅ Enforce permission
  requirePermission(user.role, 'TASK_CREATE', user.isSuperAdmin, userPerms)
  
  // ... rest of your logic
}
```

### Step 5: Admin Permission Management

Admins can grant permissions via API:

```typescript
// PATCH /api/org-admin/users/{userId}/permissions
{
  "permissions": ["TASK_CREATE", "CHANNEL_CREATE"]
}
```

Or use the UI component:
```tsx
import { UserPermissionsManager } from "@/components/user-permissions-manager"

<UserPermissionsManager
  userId="user_123"
  userName="John Doe"
  userEmail="john@example.com"
  userRole="EMPLOYEE"
/>
```

---

## Testing Your Implementation

### Backend Tests

Run the permission tests:
```bash
npm test tests/api/rbac-permissions.test.ts
```

### Frontend Tests

Run the UI tests:
```bash
npm test tests/components/rbac-ui.test.tsx
```

### Manual Testing Checklist

#### Test 1: Admin Can Create
1. Log in as ORG_ADMIN
2. Navigate to dashboard
3. ✅ "Create Task" button should be visible and enabled
4. ✅ "Create Channel" button should be visible and enabled
5. Click "Create Task" - should succeed with 201 response

#### Test 2: Manager Can Create
1. Log in as MANAGER
2. Navigate to dashboard
3. ✅ "Create Task" button should be visible and enabled
4. ✅ "Create Channel" button should be visible and enabled
5. Click "Create Task" - should succeed with 201 response

#### Test 3: Employee Cannot Create (Default)
1. Log in as EMPLOYEE (with no explicit permissions)
2. Navigate to dashboard
3. ❌ "Create Task" button should be hidden OR disabled with tooltip
4. ❌ "Create Channel" button should be hidden OR disabled with tooltip
5. Try API directly: `POST /api/tasks` - should get 403 Forbidden

#### Test 4: Employee Can Create After Permission Grant
1. Log in as ORG_ADMIN
2. Go to user management
3. Select an Employee
4. Grant "TASK_CREATE" permission
5. Log out and log in as that Employee
6. ✅ "Create Task" button should now be visible/enabled
7. Create a task - should succeed

---

## API Reference

### Permission Management Endpoints

#### Get User Permissions
```http
GET /api/org-admin/users/{userId}/permissions
Authorization: Bearer {adminToken}
```

**Response:**
```json
{
  "userId": "user_123",
  "email": "employee@company.com",
  "name": "John Employee",
  "role": "EMPLOYEE",
  "permissions": ["TASK_CREATE"]
}
```

#### Update User Permissions
```http
PATCH /api/org-admin/users/{userId}/permissions
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "permissions": ["TASK_CREATE", "CHANNEL_CREATE"]
}
```

**Response:**
```json
{
  "message": "Permissions updated successfully",
  "user": {
    "id": "user_123",
    "email": "employee@company.com",
    "name": "John Employee",
    "role": "EMPLOYEE",
    "permissions": ["TASK_CREATE", "CHANNEL_CREATE"]
  }
}
```

### Task Creation
```http
POST /api/tasks
Authorization: Bearer {userToken}
Content-Type: application/json

{
  "title": "My Task",
  "description": "Task description",
  "priority": "HIGH",
  "assigneeIds": ["user_456"]
}
```

**Permission Required:** `TASK_CREATE`

### Channel Creation
```http
POST /api/channels
Authorization: Bearer {userToken}
Content-Type: application/json

{
  "name": "My Channel",
  "description": "Channel description",
  "isPublic": true
}
```

**Permission Required:** `CHANNEL_CREATE`

---

## Common Issues & Solutions

### Issue 1: Buttons still visible for Employees
**Solution:** Clear browser cache and session storage. The session may be cached.

```javascript
// In browser console:
sessionStorage.clear()
localStorage.clear()
location.reload()
```

### Issue 2: Permission changes don't reflect immediately
**Solution:** User needs to log out and log back in, or implement real-time sync.

### Issue 3: API returns 403 even after granting permission
**Troubleshooting:**
1. Check user's permissions in database:
   ```sql
   SELECT id, email, role, permissions FROM User WHERE email = 'employee@company.com';
   ```
2. Verify permissions field is valid JSON array:
   ```json
   ["TASK_CREATE"]
   ```
3. Check session token is fresh (log out/in)

### Issue 4: TypeScript errors in usePermissions hook
**Solution:** Ensure your `next-auth` session type includes custom fields:

Create/update `types/next-auth.d.ts`:
```typescript
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      permissions: string
      isSuperAdmin: boolean
      organizationId?: string | null
    }
  }
}
```

---

## Permission Matrix

| Permission | Admin | Manager | Employee (Default) | Employee (Granted) |
|-----------|-------|---------|-------------------|-------------------|
| TASK_CREATE | ✅ | ✅ | ❌ | ✅ (if granted) |
| TASK_EDIT | ✅ | ✅ | ✅ | ✅ |
| TASK_DELETE | ✅ | ❌ | ❌ | ✅ (if granted) |
| TASK_VIEW_ALL | ✅ | ❌ | ❌ | ✅ (if granted) |
| CHANNEL_CREATE | ✅ | ✅ | ❌ | ✅ (if granted) |
| CHANNEL_MANAGE | ✅ | ❌ | ❌ | ✅ (if granted) |
| CHANNEL_DELETE | ✅ | ❌ | ❌ | ✅ (if granted) |
| ORG_USERS_MANAGE | ✅ | ❌ | ❌ | ❌ |

---

## Next Steps

1. ✅ Review the implementation plan: `docs/RBAC_IMPLEMENTATION_PLAN.md`
2. ✅ Test all API endpoints with different roles
3. ✅ Update your sidebar/dashboard components with permission checks
4. ✅ Create admin UI for managing user permissions
5. ⚠️ Consider adding audit logs for permission changes
6. ⚠️ Implement real-time permission updates (WebSocket/polling)

---

## Support

If you encounter issues:
1. Check the comprehensive implementation plan: `docs/RBAC_IMPLEMENTATION_PLAN.md`
2. Review test files for examples: `tests/api/rbac-permissions.test.ts`
3. Verify your session configuration includes custom user fields

**Need help?** Create an issue with:
- User role
- Expected behavior
- Actual behavior
- API response (if applicable)
