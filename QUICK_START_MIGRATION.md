# Quick Start: ADMIN to ORG_ADMIN Migration

This folder contains all the changes needed to remove the `ADMIN` role and consolidate to `ORG_ADMIN`.

## 🎯 What This Changes

**Before**: Your app had both `ADMIN` and `ORG_ADMIN` roles, causing confusion.

**After**: Only `ORG_ADMIN` exists for organization administrators. Each organization's ORG_ADMIN can ONLY manage their own organization.

## 📋 Pre-Migration Checklist

- [ ] **Backup your database** (critical!)
- [ ] Read `MIGRATION_GUIDE.md` completely
- [ ] Ensure you have Node.js and database access
- [ ] Test on a development/staging environment first

## 🚀 Quick Migration Steps

### 1. Backup Database (CRITICAL!)
```bash
# MySQL
mysqldump -u username -p database_name > backup_before_admin_removal.sql

# PostgreSQL
pg_dump database_name > backup_before_admin_removal.sql
```

### 2. Run Data Migration
```bash
# This updates all ADMIN users to ORG_ADMIN in the database
npx tsx scripts/migrate-admin-to-org-admin.ts
```

### 3. Apply Schema Migration
```bash
# Generate and apply the Prisma migration
npx prisma migrate dev --name remove_admin_role

# Or for production
npx prisma migrate deploy
```

### 4. Verify Changes
```sql
-- Should return 0
SELECT COUNT(*) FROM User WHERE role = 'ADMIN';

-- Should show your organization admins
SELECT id, name, email, role, organizationId FROM User WHERE role = 'ORG_ADMIN';
```

### 5. Test Everything
- [ ] Login as ORG_ADMIN
- [ ] Verify you can manage your organization
- [ ] Verify you CANNOT see other organizations
- [ ] Test user management
- [ ] Test task management
- [ ] Test all admin features

## 📚 Documentation

1. **MIGRATION_GUIDE.md** - Complete step-by-step migration guide
2. **ADMIN_ROLE_REMOVAL_SUMMARY.md** - Technical summary of all changes
3. **scripts/migrate-admin-to-org-admin.ts** - Data migration script

## 🔍 Key Changes

### Database
- ❌ Removed `ADMIN` from Role enum
- ✅ `ORG_ADMIN` is now the organization admin role

### Code
- Updated 38+ files across the application
- All API routes now check for `ORG_ADMIN` instead of `ADMIN`
- All UI components updated
- All tests updated

### Behavior
- ✅ ORG_ADMINs can manage their own organization
- ❌ ORG_ADMINs CANNOT access other organizations
- ✅ SUPER_ADMINs retain system-wide access

## ⚠️ Important Notes

### This is a Breaking Change
- All existing users with role `ADMIN` will become `ORG_ADMIN`
- The `ADMIN` role no longer exists in the system
- Organization scoping is now strictly enforced

### Organization Isolation
Each ORG_ADMIN can ONLY manage:
- Users in their organization
- Tasks in their organization
- Channels in their organization
- Projects in their organization
- Everything else in their organization

### Super Admin Access
- SUPER_ADMIN role is unchanged
- Super admins can still access ALL organizations
- Super admin capabilities remain the same

## 🆘 Troubleshooting

### Migration Script Fails
1. Check database connection
2. Verify you have write permissions
3. Check for any constraints or triggers
4. Review error messages carefully

### Users Still Have ADMIN Role
```sql
-- Force update any remaining ADMIN users
UPDATE User SET role = 'ORG_ADMIN' WHERE role = 'ADMIN';
```

### Permission Denied Errors
1. Clear browser cache
2. Logout and login again
3. Verify user's role in database
4. Check API route logs

### Rollback Needed
```bash
# Restore database backup
mysql -u username -p database_name < backup_before_admin_removal.sql

# Revert code changes
git revert <commit-hash>
```

## ✅ Verification Checklist

After migration, verify:
- [ ] No ADMIN users in database
- [ ] ORG_ADMINs can login
- [ ] ORG_ADMINs can manage their org
- [ ] ORG_ADMINs cannot see other orgs
- [ ] SUPER_ADMINs can see all orgs
- [ ] User management works
- [ ] Task management works
- [ ] All admin features work
- [ ] No console errors
- [ ] All tests pass

## 📞 Support

If you encounter issues:
1. Check the detailed `MIGRATION_GUIDE.md`
2. Review `ADMIN_ROLE_REMOVAL_SUMMARY.md`
3. Check application logs
4. Verify database state
5. Restore from backup if needed

## 🎉 Success!

Once complete, your application will have:
- ✅ Clear role hierarchy
- ✅ Proper organization isolation
- ✅ No more ADMIN/ORG_ADMIN confusion
- ✅ Better security and data isolation

---

**⚠️ Remember**: Always backup your database before making these changes!
