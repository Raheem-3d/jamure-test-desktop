# Quick Permission Reference Guide

## Common Permission Issues - SOLVED ✅

### Issue: Employee Can't Create Tasks Despite Permission
**FIXED**: The system now accepts EITHER `TASK_CREATE` OR `PROJECT_MANAGE` permission for task creation.

---

## Available Permissions

| Permission | Description | Who Needs It |
|------------|-------------|--------------|
| **TASK_CREATE** | Create new tasks/projects | Anyone who creates tasks |
| **TASK_EDIT** | Edit existing tasks | Task contributors |
| **TASK_VIEW** | View task details | All team members |
| **TASK_DELETE** | Delete tasks | Team leads, managers |
| **TASK_VIEW_ALL** | View all tasks (not just assigned) | Supervisors, managers |
| **PROJECT_MANAGE** | Full project management | Project managers, team leads |
| **PROJECT_VIEW_ALL** | View all projects | Department heads |
| **PROJECT_DELETE** | Delete projects | Senior managers |
| **CHANNEL_MANAGE** | Create/edit channels | Community managers |
| **CHANNEL_VIEW_ALL** | View all channels | Admins |
| **CHANNEL_DELETE** | Delete channels | Admins only |
| **ORG_VIEW** | View organization settings | All staff |
| **ORG_EDIT** | Edit organization settings | Admins |
| **ORG_USERS_INVITE** | Invite new users | HR, managers |
| **ORG_USERS_MANAGE** | Manage user accounts | HR, admins |
| **ORG_DELETE** | Delete organization | Super admin only |
| **REPORTS_VIEW** | View analytics/reports | Managers, clients |

---

## Quick Setup Guide

### To Let Employee Create Tasks:
1. Go to User Management
2. Select the employee
3. Grant permission: `TASK_CREATE` ✓
4. Save
5. User logs out and logs back in

### To Make Employee a Project Manager:
1. Grant permissions:
   - `PROJECT_MANAGE` ✓ (includes create/edit/view)
   - `TASK_VIEW_ALL` ✓
   - `ORG_USERS_INVITE` ✓ (optional)
2. Save and user re-logs

### To Give View-Only Access:
1. Set role to: `CLIENT`
2. Grant permissions:
   - `TASK_VIEW` ✓
   - `REPORTS_VIEW` ✓
3. Do NOT grant CREATE or EDIT permissions

---

## Role Defaults

| Role | Default Permissions |
|------|-------------------|
| **EMPLOYEE** | TASK_CREATE, TASK_EDIT, TASK_VIEW |
| **MANAGER** | EMPLOYEE permissions + PROJECT_MANAGE, REPORTS_VIEW |
| **ORG_ADMIN** | MANAGER permissions + ORG management, all channels |
| **SUPER_ADMIN** | ALL PERMISSIONS |
| **CLIENT** | TASK_VIEW, REPORTS_VIEW only |

**Note**: Custom permissions override role defaults!

---

## Troubleshooting

### User Can't Create Tasks
✅ **Check**: User has `TASK_CREATE` or `PROJECT_MANAGE`  
✅ **Action**: Grant `TASK_CREATE` permission  
✅ **Verify**: User logs out and back in  

### User Can't See "New Project" Button
✅ **Check**: `canCreateTasks` permission  
✅ **Fix**: Grant `TASK_CREATE` permission  

### User Gets "Permission Denied" Error
✅ **Check**: Browser console for specific permission  
✅ **Fix**: Grant the required permission explicitly  
✅ **Refresh**: Clear cache and re-login  

### Permission Not Taking Effect
✅ **User must log out and log back in**  
✅ Permissions are cached in session  

---

## Best Practices

1. **Principle of Least Privilege**: Grant only what's needed
2. **Use Roles First**: Rely on role defaults when possible
3. **Custom Permissions**: Only for exceptions to role defaults
4. **Document Why**: Note why custom permissions were granted
5. **Regular Audit**: Review permissions quarterly

---

## Permission Combinations

### Junior Developer
```
Role: EMPLOYEE
Custom: TASK_CREATE (already default)
Result: Can create and manage own tasks
```

### Senior Developer  
```
Role: EMPLOYEE
Custom: TASK_CREATE, TASK_VIEW_ALL
Result: Can create tasks and see all team tasks
```

### Team Lead
```
Role: MANAGER
Custom: PROJECT_MANAGE, CHANNEL_MANAGE
Result: Full project and team chat management
```

### Department Head
```
Role: ORG_ADMIN
Custom: (none needed - role has everything)
Result: Full departmental control
```

### External Client
```
Role: CLIENT
Custom: REPORTS_VIEW
Result: View-only access to assigned projects
```

---

## FAQ

**Q: What's the difference between TASK_CREATE and PROJECT_MANAGE?**  
A: `TASK_CREATE` = Create tasks only. `PROJECT_MANAGE` = Full management (create, edit, delete, assign anyone).

**Q: Can I grant permissions to roles?**  
A: No, permissions are per-user. Roles have default permissions that apply to all users with that role.

**Q: Will permissions affect existing tasks?**  
A: No, permissions control what actions users can perform, not ownership of existing items.

**Q: How do I revoke a permission?**  
A: Edit the user, uncheck the permission, save. User must re-login.

**Q: Can users have multiple roles?**  
A: No, each user has one role. Use custom permissions for additional capabilities.

---

## Quick Commands

### Check User Permissions (Browser Console)
```javascript
// View current user's permissions
console.log(session?.user?.permissions)

// Check specific permission
const perms = usePermissions()
console.log(perms.canCreateTasks)
```

### Grant Permission (Database)
```sql
-- Update user permissions
UPDATE "User" 
SET permissions = ARRAY['TASK_CREATE', 'TASK_EDIT', 'TASK_VIEW']
WHERE email = 'user@example.com';
```

---

Last Updated: December 5, 2025  
Version: 2.0 (Post Permission Fix)
