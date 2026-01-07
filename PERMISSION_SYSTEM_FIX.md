# Permission System Comprehensive Fix

## Issue Summary
The permission system had a critical flaw where custom permissions assigned to users were not properly respected. Specifically:

1. **Problem**: An Employee role user was granted `TASK_EDIT`, `TASK_VIEW`, `TASK_DELETE`, and `TASK_VIEW_ALL` permissions but couldn't create tasks.
2. **Root Cause**: The system was checking for `PROJECT_MANAGE` permission on the server-side but users were granted `TASK_CREATE` permission instead.
3. **Mismatch**: Client-side used `canCreateTasks` (checking `TASK_CREATE`) while server-side required `PROJECT_MANAGE`.

## What Was Fixed

### 1. **User Creation Form** (`components/org-add-user-form.tsx`)
**Before**: Several permissions were commented out, including the critical `TASK_CREATE` permission.

**After**: 
- ✅ Enabled ALL permissions including `TASK_CREATE` and `PROJECT_MANAGE`
- ✅ Added clear labels to distinguish between permissions
- ✅ `PROJECT_MANAGE` labeled as "Projects: Manage (Full Access)" to indicate it's broader

**Available Permissions Now**:
```typescript
- ORG_VIEW - Organization: View
- ORG_EDIT - Organization: Edit  
- ORG_USERS_INVITE - Users: Invite
- ORG_USERS_MANAGE - Users: Manage
- ORG_DELETE - Organization: Delete
- REPORTS_VIEW - Reports: View
- PROJECT_MANAGE - Projects: Manage (Full Access)
- PROJECT_VIEW_ALL - Projects: View All
- PROJECT_DELETE - Projects: Delete
- TASK_CREATE - Tasks: Create ← NOW ENABLED
- TASK_EDIT - Tasks: Edit
- TASK_VIEW - Tasks: View
- TASK_DELETE - Tasks: Delete
- TASK_VIEW_ALL - Tasks: View All
- CHANNEL_VIEW_ALL - Channels: View All
- CHANNEL_MANAGE - Channels: Manage
- CHANNEL_DELETE - Channels: Delete
```

---

### 2. **Server-Side API** (`app/api/tasks/route.ts`)
**Before**: Only checked for `PROJECT_MANAGE` permission
```typescript
if (!hasPermission(userRecord?.role, "PROJECT_MANAGE", isSuperAdmin, explicitPermissions)) {
  return "Forbidden: You don't have permission to create projects"
}
```

**After**: Accepts EITHER `TASK_CREATE` OR `PROJECT_MANAGE`
```typescript
const canCreateTask = hasPermission(userRecord?.role, "TASK_CREATE", isSuperAdmin, explicitPermissions);
const canManageProject = hasPermission(userRecord?.role, "PROJECT_MANAGE", isSuperAdmin, explicitPermissions);

if (!canCreateTask && !canManageProject) {
  return "Forbidden: You don't have permission to create projects. You need either TASK_CREATE or PROJECT_MANAGE permission."
}
```

**Result**: Users with EITHER permission can now create tasks/projects.

---

### 3. **Client-Side Permission Hook** (`lib/rbac-utils.tsx`)
**Before**: `canCreateTasks` only checked `TASK_CREATE` permission
```typescript
canCreateTasks: granted("TASK_CREATE", defaults.canCreateTasks)
```

**After**: Checks BOTH `TASK_CREATE` AND `PROJECT_MANAGE` (OR logic)
```typescript
canCreateTasks: granted("TASK_CREATE", defaults.canCreateTasks) || granted("PROJECT_MANAGE", defaults.canManageProjects)
```

**Result**: UI properly shows create buttons for users with either permission.

---

### 4. **Task Creation Page** (`app/dashboard/tasks/new/page.tsx`)
**Before**: Only checked `canManageProjects`
```typescript
const canAccess = perms.canManageProjects

if (!perms.canManageProjects) {
  toast.error("You don't have permission to create projects")
  router.push("/dashboard")
}
```

**After**: Checks both `canCreateTasks` OR `canManageProjects`
```typescript
const canAccess = perms.canCreateTasks || perms.canManageProjects

if (!perms.canCreateTasks && !perms.canManageProjects) {
  toast.error("You don't have permission to create projects. You need either TASK_CREATE or PROJECT_MANAGE permission.")
  router.push("/dashboard")
}
```

---

### 5. **Tasks List Page** (`app/dashboard/tasks/page.tsx`)
**Changed**: All create buttons now use `canCreateTasks` instead of `canManageProjects`

**Before**:
```tsx
{perms.canManageProjects && (
  <Button asChild>
    <Link href="/dashboard/tasks/new">New Project</Link>
  </Button>
)}
```

**After**:
```tsx
{perms.canCreateTasks && (
  <Button asChild>
    <Link href="/dashboard/tasks/new">New Project</Link>
  </Button>
)}
```

---

### 6. **Sidebar Component** (`components/sidebar.tsx`)
**Changed**: Project creation check now includes `canCreateTasks`

**Before**:
```typescript
const canCreateProjectsOrChannels = perms.canManageChannels || perms.canManageProjects
```

**After**:
```typescript
const canCreateProjectsOrChannels = perms.canManageChannels || perms.canCreateTasks
```

---

### 7. **ProjectPage Component** (`components/ProjectPage.tsx`)
**Changed**: Updated to use `canCreateTasks`

**Before**:
```typescript
const canCreateProjects = perms.canManageProjects
```

**After**:
```typescript
const canCreateProjects = perms.canCreateTasks
```

---

## How Permissions Work Now

### Permission Hierarchy
```
1. Super Admin → Has ALL permissions (bypasses all checks)
2. Explicit Permissions → Permissions directly assigned to user
3. Role Defaults → Default permissions based on user's role
```

### Evaluation Logic
For any permission check:
```typescript
if (isSuperAdmin) return true;              // 1. Super admin check
if (explicitPermissions.includes(perm)) return true;  // 2. Custom permission check
return roleDefaults[role].includes(perm);    // 3. Role-based default
```

### Default Role Permissions
```typescript
EMPLOYEE (default): 
  - TASK_CREATE ✓
  - TASK_EDIT ✓
  - TASK_VIEW ✓
  - PROJECT_MANAGE ✗

MANAGER:
  - TASK_CREATE ✓
  - TASK_EDIT ✓
  - TASK_VIEW ✓
  - PROJECT_MANAGE ✓

ORG_ADMIN:
  - TASK_CREATE ✓
  - TASK_EDIT ✓
  - TASK_VIEW ✓
  - PROJECT_MANAGE ✓
  - (+ many more)

SUPER_ADMIN:
  - ALL PERMISSIONS ✓
```

---

## Testing Scenarios

### Scenario 1: Employee with TASK_CREATE
```
User: John (Employee)
Granted Permissions: TASK_CREATE, TASK_EDIT, TASK_VIEW

Expected Result:
✅ Can create tasks/projects
✅ Can edit tasks
✅ Can view tasks
✅ Create button appears in UI
✅ Can access /dashboard/tasks/new
✅ API accepts task creation
```

### Scenario 2: Employee with PROJECT_MANAGE
```
User: Jane (Employee)
Granted Permissions: PROJECT_MANAGE

Expected Result:
✅ Can create tasks/projects (via PROJECT_MANAGE)
✅ Can edit tasks
✅ Can delete tasks (if granted)
✅ Full project management capabilities
```

### Scenario 3: Employee with Both
```
User: Bob (Employee)
Granted Permissions: TASK_CREATE, PROJECT_MANAGE

Expected Result:
✅ All task/project capabilities
✅ Redundant but safe (OR logic ensures it works)
```

### Scenario 4: Employee without Either
```
User: Alice (Employee)
Granted Permissions: TASK_VIEW, TASK_EDIT

Expected Result:
❌ Cannot create tasks/projects
❌ Create button hidden in UI
❌ Redirected from /dashboard/tasks/new
❌ API rejects task creation with 403
```

---

## Migration Notes

### For Existing Users
If you have users who were previously unable to create tasks despite having permissions:

1. **Check their permissions** via the user management panel
2. **Verify they have either**:
   - `TASK_CREATE` permission, OR
   - `PROJECT_MANAGE` permission
3. **If missing**: Edit the user and grant `TASK_CREATE`
4. **User must log out and log back in** for permissions to take effect

### Database Check
No database migration required. The permission system reads from the existing `permissions` field on the User model.

---

## Permission Best Practices

### When to Grant TASK_CREATE
✅ User needs to create tasks/projects  
✅ User should be able to manage their own created tasks  
✅ Limited project management scope  

**Example**: Team members who create their own tasks but don't manage others' tasks

### When to Grant PROJECT_MANAGE  
✅ User needs FULL project management capabilities  
✅ User should manage ANY project (not just their own)  
✅ User needs to delete/archive projects  
✅ User coordinates multiple team members  

**Example**: Project managers, team leads, department heads

### Recommended Permission Sets

**Junior Developer**:
```
- TASK_CREATE
- TASK_VIEW
- TASK_EDIT (own tasks)
```

**Senior Developer**:
```
- TASK_CREATE
- TASK_VIEW
- TASK_EDIT
- TASK_VIEW_ALL
```

**Team Lead**:
```
- PROJECT_MANAGE (includes all task permissions)
- TASK_VIEW_ALL
- CHANNEL_MANAGE
```

**Department Manager**:
```
- PROJECT_MANAGE
- PROJECT_VIEW_ALL
- PROJECT_DELETE
- ORG_USERS_INVITE
- REPORTS_VIEW
```

---

## Files Modified

1. ✅ `components/org-add-user-form.tsx` - Enabled all permissions
2. ✅ `app/api/tasks/route.ts` - OR logic for TASK_CREATE | PROJECT_MANAGE
3. ✅ `lib/rbac-utils.tsx` - Updated canCreateTasks to check both permissions
4. ✅ `app/dashboard/tasks/new/page.tsx` - Updated access check
5. ✅ `app/dashboard/tasks/page.tsx` - Changed all create buttons to use canCreateTasks
6. ✅ `components/sidebar.tsx` - Updated canCreateProjectsOrChannels
7. ✅ `components/ProjectPage.tsx` - Updated canCreateProjects

---

## Verification Steps

### Step 1: Verify Form Shows All Permissions
1. Go to Organization Settings → Users
2. Click "Add User"
3. Scroll to Permissions section
4. ✅ Verify `TASK_CREATE` and `PROJECT_MANAGE` are both visible and selectable

### Step 2: Test Employee with TASK_CREATE
1. Create new user with Employee role
2. Grant only `TASK_CREATE` permission
3. Save user
4. Log in as that user
5. ✅ Verify "New Project" button appears on dashboard
6. ✅ Click "New Project" - should load successfully
7. ✅ Create a project - should succeed

### Step 3: Test Employee without Permission
1. Create new user with Employee role
2. Grant only `TASK_VIEW` permission (no TASK_CREATE)
3. Save user
4. Log in as that user
5. ✅ Verify "New Project" button is HIDDEN
6. ✅ Try accessing `/dashboard/tasks/new` directly
7. ✅ Should redirect to dashboard with error

### Step 4: Test API Directly
```bash
# Test with TASK_CREATE permission
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"title": "Test Task", "description": "Testing"}'

# Expected: 200 OK if user has TASK_CREATE or PROJECT_MANAGE
# Expected: 403 Forbidden if user has neither
```

---

## Rollback Instructions

If issues occur, revert these changes in order:

1. Revert `lib/rbac-utils.tsx` - removes OR logic
2. Revert `app/api/tasks/route.ts` - back to PROJECT_MANAGE only
3. Revert UI components - back to canManageProjects checks
4. Restart application

---

## Future Improvements

### Suggested Enhancements
1. **Permission Groups**: Create permission templates like "Developer", "Manager", "Admin"
2. **Permission Inheritance**: Department-level permissions that cascade to users
3. **Time-based Permissions**: Temporary permission grants that expire
4. **Audit Log**: Track when permissions are granted/revoked
5. **Permission Preview**: Show users what they can/cannot do before saving

### Performance Optimization
- Cache permission checks in session
- Reduce database queries by loading permissions once
- Pre-compute permission flags at login time

---

## Support

If users still cannot create tasks after this fix:

1. **Check browser console** for errors
2. **Verify session** - user may need to log out/in
3. **Check database** - ensure `permissions` field is JSON array
4. **Verify API response** - check network tab for 403 errors
5. **Review server logs** - look for permission denial messages

---

## Conclusion

The permission system now properly respects BOTH:
- **Explicit permissions** assigned to individual users
- **Role-based defaults** from user roles

Users with `TASK_CREATE` OR `PROJECT_MANAGE` can create tasks/projects, regardless of their role. The system uses OR logic, so having either permission grants access.

**Key Principle**: Custom permissions ALWAYS override role defaults. If you grant a permission explicitly, the user has that capability, period.
