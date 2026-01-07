# Migration Guide: Removing ADMIN Role

This guide explains how to migrate your application from using both `ADMIN` and `ORG_ADMIN` roles to using only `ORG_ADMIN` for organization administrators.

## Overview

The application previously had two admin roles:
- **ADMIN**: Used for organization-wide administration
- **ORG_ADMIN**: Intended for organization-scoped administration

This caused confusion and inconsistent behavior. We've refactored the system so that:
- **ORG_ADMIN** is now the primary role for organization administrators
- **ADMIN** role has been completely removed
- Each organization has its own **ORG_ADMIN**(s) who can only see and manage their specific organization
- **SUPER_ADMIN** remains for system-wide access across all organizations

## Changes Made

### 1. Database Schema (Prisma)
- Removed `ADMIN` from the `Role` enum
- Kept only: `SUPER_ADMIN`, `ORG_ADMIN`, `MANAGER`, `EMPLOYEE`, `ORG_MEMBER`, `CLIENT`

### 2. Permission System
- Updated `lib/permissions.ts` to remove `ADMIN` role
- `checkOrgAdmin()` now only checks for `ORG_ADMIN` and `SUPER_ADMIN`
- All permissions previously granted to `ADMIN` are now granted to `ORG_ADMIN`

### 3. RBAC Utilities
- Updated `lib/rbac-utils.tsx` to remove `ADMIN` references
- Updated role display names and badge variants

### 4. API Routes
Updated all API routes that checked for `ADMIN` role:
- `/api/users/[userId]` - Changed to check for `ORG_ADMIN`
- `/api/tasks/*` - Changed to check for `ORG_ADMIN`
- `/api/reminders/*` - Changed to check for `ORG_ADMIN`
- `/api/departments/*` - Changed to check for `ORG_ADMIN`
- `/api/invitations/*` - Changed to check for `ORG_ADMIN`
- `/api/organizations/register` - Creates users with `ORG_ADMIN` role
- And many more...

### 5. UI Components
- Updated reminder components to check for `ORG_ADMIN` instead of `ADMIN`
- All admin-only features now check for `ORG_ADMIN`

### 6. Tests
- Updated test files to use `ORG_ADMIN` instead of `ADMIN`

## Migration Steps

### Step 1: Backup Your Database
```bash
# Create a backup of your database before proceeding
mysqldump -u username -p database_name > backup_before_migration.sql
```

### Step 2: Run the Data Migration Script
This script will update all existing users with role `ADMIN` to `ORG_ADMIN`:

```bash
npx tsx scripts/migrate-admin-to-org-admin.ts
```

The script will:
1. Count all users with role `ADMIN`
2. Update them to `ORG_ADMIN`
3. Verify the migration was successful

### Step 3: Generate and Apply Prisma Migration
After running the data migration, update your database schema:

```bash
# Generate a new migration
npx prisma migrate dev --name remove_admin_role

# Or if in production
npx prisma migrate deploy
```

### Step 4: Verify the Migration
Check your database to ensure:
1. No users have role `ADMIN`
2. All organization administrators have role `ORG_ADMIN`
3. Super admins still have role `SUPER_ADMIN`

```sql
-- Check for any remaining ADMIN users
SELECT COUNT(*) FROM User WHERE role = 'ADMIN';
-- Should return 0

-- Check ORG_ADMIN users
SELECT id, name, email, role, organizationId FROM User WHERE role = 'ORG_ADMIN';

-- Check SUPER_ADMIN users
SELECT id, name, email, role, isSuperAdmin FROM User WHERE role = 'SUPER_ADMIN';
```

### Step 5: Test the Application
1. **Login as an ORG_ADMIN**: Verify you can manage your organization
2. **Test organization scoping**: Ensure ORG_ADMINs can only see their own organization's data
3. **Login as a SUPER_ADMIN**: Verify cross-organization access still works
4. **Test all admin features**:
   - User management
   - Task creation/management
   - Channel management
   - Department management
   - Reminder management

### Step 6: Deploy to Production

1. **Notify users** about the changes (if needed)
2. **Run the migration script** on production database
3. **Deploy the updated code**
4. **Monitor for any issues**

## Rollback Plan

If you need to rollback:

### Rollback Step 1: Restore Database
```bash
mysql -u username -p database_name < backup_before_migration.sql
```

### Rollback Step 2: Revert Code Changes
```bash
git revert <commit-hash>
```

## Post-Migration Verification Checklist

- [ ] No users have role `ADMIN`
- [ ] All organization admins have role `ORG_ADMIN`
- [ ] Organization admins can manage their organization
- [ ] Organization admins CANNOT see other organizations
- [ ] Super admins can see all organizations
- [ ] All API endpoints work correctly
- [ ] User invitation works
- [ ] Task management works
- [ ] Department management works
- [ ] Reminder system works
- [ ] All tests pass

## Important Notes

1. **Organization Scoping**: ORG_ADMINs can ONLY manage users, tasks, channels, etc. within their own organization
2. **No Cross-Organization Access**: Unlike before, ORG_ADMINs cannot access data from other organizations
3. **Super Admins**: Only SUPER_ADMINs have system-wide access across all organizations
4. **Breaking Change**: This is a breaking change. All references to the `ADMIN` role must be updated

## Support

If you encounter any issues during migration:
1. Check the error logs
2. Verify database state
3. Review the migration script output
4. Restore from backup if necessary

## Documentation Updates

The following documentation files have been updated to reflect these changes:
- All API route documentation
- RBAC documentation
- Role permission matrices
- Super admin dashboard documentation
- Multi-tenant RBAC guide

---

**Migration Date**: November 13, 2025
**Breaking Change**: Yes
**Database Changes**: Yes
**Requires Downtime**: Minimal (during migration script execution)
