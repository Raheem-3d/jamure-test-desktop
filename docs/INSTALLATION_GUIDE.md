# Installation & Migration Guide

## 🚀 Setting Up the Multi-Tenant RBAC System

Follow these steps to enable the multi-tenant RBAC system in your existing application.

---

## Step 1: Environment Configuration

### 1.1 Update `.env` file

Add the following to your `.env` file:

```env
# Super Admin Email Addresses (comma-separated)
SUPERADMINS=admin@example.com,superadmin@company.com

# Add more as needed
# SUPERADMINS=admin1@company.com,admin2@company.com,owner@company.com
```

**Important**: Replace the email addresses with actual super admin emails.

---

## Step 2: Database Migration

### 2.1 Verify Schema

The `isSuperAdmin` field should already exist in your User model. Verify in `prisma/schema.prisma`:

```prisma
model User {
  id           String  @id @default(cuid())
  email        String  @unique
  isSuperAdmin Boolean @default(false)
  role         Role    @default(EMPLOYEE)
  // ... other fields
}
```

### 2.2 Run Migration (if needed)

If you made changes to the schema:

```bash
npx prisma migrate dev --name add-rbac-system
npx prisma generate
```

### 2.3 Create Super Admin Users

Run this SQL to promote existing users to super admins:

```sql
-- Update existing user to super admin
UPDATE User 
SET 
  isSuperAdmin = true, 
  role = 'SUPER_ADMIN'
WHERE email = 'admin@example.com';

-- Or update multiple users
UPDATE User 
SET 
  isSuperAdmin = true, 
  role = 'SUPER_ADMIN'
WHERE email IN (
  'admin@example.com',
  'superadmin@company.com'
);
```

**Alternative**: Use Prisma Studio

```bash
npx prisma studio
```

Then manually update the users:
- Set `isSuperAdmin` to `true`
- Set `role` to `SUPER_ADMIN`

---

## Step 3: Restart Application

### 3.1 Clear Next.js Cache

```bash
rm -rf .next
# On Windows: rmdir /s /q .next
```

### 3.2 Restart Development Server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

---

## Step 4: Verify Installation

### 4.1 Test Super Admin Login

1. Login with a super admin email
2. Navigate to `/superadmin`
3. You should see the Super Admin Dashboard

### 4.2 Verify Session

Add this to any page to check your session:

```typescript
import { useAuth } from "@/contexts/auth-context"

export function TestComponent() {
  const { user, isSuperAdmin } = useAuth()
  
  console.log("User:", user)
  console.log("Is Super Admin:", isSuperAdmin)
  
  return <div>Check console</div>
}
```

### 4.3 Test Tenant Isolation

1. Login as a regular user from Organization A
2. Try to access `/api/users`
3. You should only see users from Organization A

4. Login as a super admin
5. Access `/api/superadmin/users`
6. You should see users from ALL organizations

---

## Step 5: Update Existing Components (Optional)

### 5.1 Add Role-Based Navigation

Update your navigation component:

```typescript
import { useAuth } from "@/contexts/auth-context"
import { useRole } from "@/lib/rbac-utils"
import Link from "next/link"

export function Navigation() {
  const { isSuperAdmin, isAdmin } = useRole()
  
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/tasks">Tasks</Link>
      
      {isAdmin && (
        <Link href="/settings">Settings</Link>
      )}
      
      {isSuperAdmin && (
        <Link href="/superadmin">Super Admin</Link>
      )}
    </nav>
  )
}
```

### 5.2 Add Permission-Based Features

Update existing components to use permissions:

```typescript
import { usePermissions } from "@/lib/rbac-utils"

export function TaskActions() {
  const { canDeleteTasks, canEditTasks } = usePermissions()
  
  return (
    <>
      {canEditTasks && <Button>Edit</Button>}
      {canDeleteTasks && <Button>Delete</Button>}
    </>
  )
}
```

---

## Step 6: Migrate Existing API Routes (Gradual)

You can migrate existing API routes gradually. The system is backward compatible.

### Before (existing route):
```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  
  const tasks = await db.task.findMany({
    where: { organizationId: user?.organizationId }
  })
  
  return NextResponse.json(tasks)
}
```

### After (with RBAC):
```typescript
import { getTenantWhereClause } from "@/lib/org"

export async function GET(req: Request) {
  const whereClause = await getTenantWhereClause()
  const tasks = await db.task.findMany({ where: whereClause })
  
  return NextResponse.json(tasks)
}
```

---

## Step 7: Test All Roles

### 7.1 Create Test Users

Create users with different roles to test:

```sql
-- Create org admin
INSERT INTO User (id, email, name, password, role, organizationId)
VALUES ('test1', 'orgadmin@test.com', 'Org Admin', '$2a$...', 'ORG_ADMIN', 'org1');

-- Create manager
INSERT INTO User (id, email, name, password, role, organizationId)
VALUES ('test2', 'manager@test.com', 'Manager', '$2a$...', 'MANAGER', 'org1');

-- Create employee
INSERT INTO User (id, email, name, password, role, organizationId)
VALUES ('test3', 'employee@test.com', 'Employee', '$2a$...', 'EMPLOYEE', 'org1');

-- Create client
INSERT INTO User (id, email, name, password, role, organizationId)
VALUES ('test4', 'client@test.com', 'Client', '$2a$...', 'CLIENT', 'org1');
```

### 7.2 Test Each Role

Test that each role has appropriate access:

| Role | Can Access `/superadmin` | Can Delete Tasks | Can Edit Org | Can View All Tasks |
|------|-------------------------|------------------|--------------|-------------------|
| SUPER_ADMIN | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| ORG_ADMIN | ❌ No | ✅ Yes (own org) | ✅ Yes (own org) | ✅ Yes (own org) |
| MANAGER | ❌ No | ❌ No | ❌ No | ❌ No |
| EMPLOYEE | ❌ No | ❌ No | ❌ No | ❌ No |
| CLIENT | ❌ No | ❌ No | ❌ No | ❌ No |

---

## Step 8: Production Deployment

### 8.1 Environment Variables

Ensure production `.env` has super admin emails:

```env
SUPERADMINS=production-admin@company.com,ceo@company.com
```

### 8.2 Database Migration

Run migrations on production:

```bash
npx prisma migrate deploy
```

### 8.3 Update Super Admins

```sql
UPDATE User 
SET isSuperAdmin = true, role = 'SUPER_ADMIN'
WHERE email = 'production-admin@company.com';
```

### 8.4 Build and Deploy

```bash
npm run build
npm start
```

---

## Troubleshooting

### Issue: "Super admin dashboard shows access denied"

**Solution:**
1. Check `.env` has correct email in `SUPERADMINS`
2. Verify database has `isSuperAdmin = true` for that user
3. Clear browser cache and cookies
4. Logout and login again

### Issue: "Users can see other organization's data"

**Solution:**
1. Ensure API routes use `getTenantWhereClause()`
2. Check that `organizationId` is set on all data
3. Verify middleware is protecting routes

### Issue: "Permission denied for valid actions"

**Solution:**
1. Check user's role in database
2. Review permissions in `lib/permissions.ts`
3. Ensure session has correct role information

### Issue: "Session doesn't have isSuperAdmin flag"

**Solution:**
1. Check `lib/auth.ts` callbacks are updated
2. Restart Next.js server
3. Clear session and re-login

---

## Rollback (if needed)

If you need to rollback:

### 1. Remove Super Admin Routes

Comment out or delete super admin routes in `app/api/superadmin/`

### 2. Revert API Routes

Change updated API routes back to original implementation

### 3. Remove Environment Variable

Remove `SUPERADMINS` from `.env`

### 4. Database (Optional)

```sql
UPDATE User SET isSuperAdmin = false;
```

---

## Security Checklist

Before going to production:

- [ ] Super admin emails are set in environment variable
- [ ] All API routes have proper authentication
- [ ] Tenant isolation is enforced in all queries
- [ ] Permission checks are in place for sensitive operations
- [ ] Super admin access is logged
- [ ] Regular users cannot access `/api/superadmin/*`
- [ ] Organization admins cannot access other organizations
- [ ] Session cookies are secure
- [ ] HTTPS is enabled in production

---

## Maintenance

### Regular Tasks

1. **Review Super Admin Access** (Monthly)
   - Check who has super admin access
   - Remove inactive super admins

2. **Monitor Access Logs** (Weekly)
   - Review super admin actions
   - Check for unauthorized access attempts

3. **Update Permissions** (As needed)
   - Review role permissions
   - Add new permissions as features grow

4. **Database Cleanup** (Quarterly)
   - Remove orphaned data
   - Verify data integrity

---

## Next Steps

1. ✅ Complete installation
2. ✅ Test all roles
3. ✅ Update existing components to use RBAC utilities
4. ✅ Train team on new permission system
5. ✅ Deploy to production

---

## Support Resources

- **Full Documentation**: `docs/MULTI_TENANT_RBAC.md`
- **Quick Reference**: `docs/RBAC_QUICK_REFERENCE.md`
- **Code Examples**: `docs/RBAC_UTILS_EXAMPLES.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_COMPLETE.md`

---

**Installation complete!** Your application now has enterprise-grade multi-tenant RBAC. 🎉
