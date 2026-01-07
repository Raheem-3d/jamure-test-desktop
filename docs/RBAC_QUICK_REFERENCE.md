# Quick Reference: Multi-Tenant RBAC

## Role Hierarchy

```
SUPER_ADMIN (System-wide access)
    ↓
ADMIN / ORG_ADMIN (Organization-wide access)
    ↓
MANAGER (Project/Team management)
    ↓
EMPLOYEE / ORG_MEMBER (Basic task access)
    ↓
CLIENT (Read-only access)
```

## Quick Permission Check

| Permission | SUPER_ADMIN | ADMIN | MANAGER | EMPLOYEE | CLIENT |
|------------|-------------|-------|---------|----------|--------|
| Cross-org access | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create org | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete org | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage all users | ✅ | ✅* | ❌ | ❌ | ❌ |
| Invite users | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all tasks | ✅ | ✅* | ❌ | ❌ | ❌ |
| Create tasks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete tasks | ✅ | ✅ | ❌ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ❌ | ✅ |

\* Within their organization only

## Common Code Patterns

### 1. Check if Super Admin

```typescript
import { useAuth } from "@/contexts/auth-context"

const { isSuperAdmin } = useAuth()

if (isSuperAdmin) {
  // Show super admin features
}
```

### 2. Check if Org Admin

```typescript
const { isOrgAdmin } = useAuth()

if (isOrgAdmin) {
  // Show org admin features
}
```

### 3. API Route with Tenant Isolation

```typescript
import { getTenantWhereClause } from "@/lib/org"

export async function GET(req: Request) {
  const whereClause = await getTenantWhereClause()
  const data = await db.model.findMany({ where: whereClause })
  return NextResponse.json(data)
}
```

### 4. Super Admin Only API Route

```typescript
import { checkSuperAdmin } from "@/lib/permissions"
import { getSessionUserWithPermissions } from "@/lib/org"

export async function GET(req: Request) {
  const user = await getSessionUserWithPermissions()
  checkSuperAdmin(user.isSuperAdmin)
  
  // Super admin logic here
  const allData = await db.model.findMany()
  return NextResponse.json(allData)
}
```

### 5. Permission-Based Access

```typescript
import { requirePermission } from "@/lib/permissions"

const session = await getServerSession(authOptions)
requirePermission(session?.user?.role, "TASK_DELETE", session?.user?.isSuperAdmin)
```

### 6. Organization Access Validation

```typescript
import { assertOrganizationAccess } from "@/lib/org"

// Throws error if user cannot access this org
await assertOrganizationAccess(targetOrgId)
```

## API Endpoints Quick Reference

### Regular User Endpoints (Tenant-Scoped)
- `GET /api/users` - Users in my organization
- `GET /api/tasks` - Tasks in my organization
- `GET /api/channels` - Channels I'm member of in my org

### Super Admin Endpoints (Cross-Organization)
- `GET /api/superadmin/organizations` - All organizations
- `GET /api/superadmin/users` - All users
- `GET /api/superadmin/tasks` - All tasks
- `GET /api/superadmin/channels` - All channels
- `GET /api/superadmin/projects` - All projects
- `GET /api/superadmin/stats` - System statistics

## Environment Setup

### .env Configuration

```env
# Super Admin Emails (comma-separated)
SUPERADMINS=admin@example.com,superadmin@company.com

# Database
DATABASE_URL="mysql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup

```sql
-- Make user a super admin
UPDATE User 
SET isSuperAdmin = true, role = 'SUPER_ADMIN' 
WHERE email = 'admin@example.com';

-- Make user an org admin
UPDATE User 
SET role = 'ORG_ADMIN' 
WHERE email = 'orgadmin@company.com';
```

## Component Access Patterns

### Show/Hide Based on Role

```typescript
"use client"
import { useAuth } from "@/contexts/auth-context"

export function MyComponent() {
  const { user, isSuperAdmin, isOrgAdmin } = useAuth()

  return (
    <div>
      {/* Everyone sees this */}
      <div>Welcome {user?.name}</div>

      {/* Only org admins and super admins */}
      {isOrgAdmin && (
        <button>Manage Users</button>
      )}

      {/* Only super admins */}
      {isSuperAdmin && (
        <button>Manage All Organizations</button>
      )}
    </div>
  )
}
```

### Conditional Navigation

```typescript
"use client"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export function Navigation() {
  const { isSuperAdmin, isOrgAdmin } = useAuth()

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/tasks">Tasks</Link>
      
      {isOrgAdmin && (
        <Link href="/settings">Organization Settings</Link>
      )}
      
      {isSuperAdmin && (
        <Link href="/superadmin">Super Admin</Link>
      )}
    </nav>
  )
}
```

## Data Isolation Rules

### ✅ Correct Patterns

```typescript
// 1. Scoped query
const whereClause = await getTenantWhereClause({ status: "ACTIVE" })
const tasks = await db.task.findMany({ where: whereClause })

// 2. Explicit check
const user = await getSessionUserWithPermissions()
if (user.isSuperAdmin) {
  // Can access all
} else {
  // Scoped to user.organizationId
}

// 3. Validate access
await assertOrganizationAccess(targetOrgId)
```

### ❌ Incorrect Patterns

```typescript
// DON'T: Query all without scoping
const tasks = await db.task.findMany() // ❌

// DON'T: Trust client-provided org ID without validation
const orgId = req.query.orgId
const data = await db.task.findMany({ where: { organizationId: orgId } }) // ❌

// DON'T: Skip permission checks
await db.task.delete({ where: { id } }) // ❌ No permission check
```

## Debugging Tips

### Check Current User Context

```typescript
const user = await getSessionUserWithPermissions()
console.log({
  id: user.id,
  email: user.email,
  role: user.role,
  isSuperAdmin: user.isSuperAdmin,
  organizationId: user.organizationId
})
```

### Test Tenant Isolation

```typescript
// Log what query is being executed
const whereClause = await getTenantWhereClause()
console.log("Query scope:", whereClause)
```

### Verify Permissions

```typescript
import { hasPermission } from "@/lib/permissions"

const canEdit = hasPermission(user.role, "TASK_EDIT", user.isSuperAdmin)
console.log("Can edit tasks:", canEdit)
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| User sees other org's data | Use `getTenantWhereClause()` in API |
| Permission denied | Check role permissions in `lib/permissions.ts` |
| Super admin can't access dashboard | Check `SUPERADMINS` env var and `isSuperAdmin` flag |
| Session doesn't have role | Update `lib/auth.ts` callbacks |
| Client shows wrong role | Clear browser cache and re-login |

## Testing Checklist

- [ ] Regular user CANNOT see other org's data
- [ ] Org admin CAN manage users in their org
- [ ] Org admin CANNOT see other org's data
- [ ] Super admin CAN see all organizations
- [ ] Super admin CAN access super admin dashboard
- [ ] Manager CAN create tasks
- [ ] Employee CANNOT delete tasks
- [ ] Client has read-only access
- [ ] Suspended org users cannot access system
- [ ] Session includes isSuperAdmin flag

## URLs

- Super Admin Dashboard: `/superadmin`
- Organization Settings: `/u/settings`
- User Profile: `/u/profile`
- Tasks: `/dashboard/tasks`
- Channels: `/dashboard/channels`

---

**Need Help?** Check the full documentation at `docs/MULTI_TENANT_RBAC.md`
