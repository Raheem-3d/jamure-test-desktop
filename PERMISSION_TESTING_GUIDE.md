# Permission System Testing Guide

## Pre-Test Setup

### 1. Create Test Users
Create the following test users to verify all permission scenarios:

```
User 1: test-employee@example.com
Role: EMPLOYEE
Custom Permissions: TASK_CREATE, TASK_EDIT, TASK_VIEW

User 2: test-employee-no-create@example.com  
Role: EMPLOYEE
Custom Permissions: TASK_EDIT, TASK_VIEW (NO TASK_CREATE)

User 3: test-manager@example.com
Role: MANAGER
Custom Permissions: (none - use role defaults)

User 4: test-employee-project-manage@example.com
Role: EMPLOYEE  
Custom Permissions: PROJECT_MANAGE

User 5: test-client@example.com
Role: CLIENT
Custom Permissions: TASK_VIEW
```

---

## Test Cases

### ✅ Test 1: Employee with TASK_CREATE Can Create Tasks

**User**: test-employee@example.com  
**Permissions**: TASK_CREATE, TASK_EDIT, TASK_VIEW

**Steps**:
1. Log in as test-employee@example.com
2. Navigate to Dashboard
3. Look for "New Project" button in top right
4. Click "New Project"
5. Fill in task details:
   - Title: "Test Task by Employee"
   - Description: "Testing TASK_CREATE permission"
   - Priority: Medium
   - Assign to yourself
6. Click "Create Project"

**Expected Results**:
- ✅ "New Project" button is visible
- ✅ Can access `/dashboard/tasks/new` page
- ✅ Form loads successfully
- ✅ Task creation succeeds
- ✅ Success toast appears
- ✅ Redirected to task detail page
- ✅ Task appears in "Created by Me" tab

**If Failed**:
- Check browser console for errors
- Verify user permissions in database
- Check user logged out and back in after permission grant

---

### ✅ Test 2: Employee without TASK_CREATE Cannot Create Tasks

**User**: test-employee-no-create@example.com  
**Permissions**: TASK_EDIT, TASK_VIEW (NO create permission)

**Steps**:
1. Log in as test-employee-no-create@example.com
2. Navigate to Dashboard
3. Check for "New Project" button
4. Attempt to access `/dashboard/tasks/new` directly in URL

**Expected Results**:
- ✅ "New Project" button is HIDDEN
- ✅ "Created by Me" tab is HIDDEN
- ✅ Direct URL access redirects to /dashboard
- ✅ Error toast: "You don't have permission to create projects"
- ✅ Cannot see "Create a New Project" links anywhere

**If Failed**:
- UI may be cached - hard refresh (Ctrl+Shift+R)
- Check session has correct permissions
- Verify user doesn't have TASK_CREATE or PROJECT_MANAGE

---

### ✅ Test 3: Manager Can Create Tasks (Role Default)

**User**: test-manager@example.com  
**Permissions**: (role defaults only)

**Steps**:
1. Log in as test-manager@example.com
2. Navigate to Dashboard
3. Click "New Project"
4. Create a task
5. Verify task appears

**Expected Results**:
- ✅ Can create tasks (MANAGER role has TASK_CREATE by default)
- ✅ Can create tasks (MANAGER role has PROJECT_MANAGE by default)
- ✅ Can assign to any user
- ✅ All management features available

**If Failed**:
- Check role is correctly set to MANAGER
- Verify DefaultRolePermissions in lib/permissions.ts

---

### ✅ Test 4: Employee with PROJECT_MANAGE Can Create Tasks

**User**: test-employee-project-manage@example.com  
**Permissions**: PROJECT_MANAGE

**Steps**:
1. Log in as test-employee-project-manage@example.com
2. Navigate to Dashboard
3. Create a new task
4. Verify full project management capabilities

**Expected Results**:
- ✅ Can create tasks (via PROJECT_MANAGE)
- ✅ Can edit any task
- ✅ Can delete tasks
- ✅ Can manage assignees
- ✅ Full project controls visible

**If Failed**:
- Verify PROJECT_MANAGE is granted
- Check lib/rbac-utils.tsx OR logic

---

### ✅ Test 5: Client Cannot Create Tasks

**User**: test-client@example.com  
**Permissions**: TASK_VIEW

**Steps**:
1. Log in as test-client@example.com
2. Check dashboard
3. Try to access task creation

**Expected Results**:
- ✅ No "New Project" button
- ✅ Can view assigned tasks only
- ✅ Cannot edit tasks
- ✅ Cannot delete tasks
- ✅ Read-only access

**If Failed**:
- Verify role is CLIENT
- Check only TASK_VIEW is granted

---

## API Testing

### Test API Endpoint Directly

**Test 1: With TASK_CREATE Permission**
```bash
# Login and get session cookie first
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test-employee@example.com", "password": "password"}'

# Create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "title": "API Test Task",
    "description": "Testing via API",
    "priority": "MEDIUM"
  }'

# Expected: 200 OK with task object
```

**Test 2: Without Permission**
```bash
# Login as user without TASK_CREATE
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test-employee-no-create@example.com", "password": "password"}'

# Try to create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "title": "Should Fail",
    "description": "Testing"
  }'

# Expected: 403 Forbidden
# {"message": "Forbidden: You don't have permission to create projects..."}
```

---

## Browser Console Testing

### Check Permissions in Console

```javascript
// Open browser console (F12)

// 1. Check current user
console.log('User:', session?.user)

// 2. Check permissions array
console.log('Permissions:', session?.user?.permissions)

// 3. Check computed permissions
const perms = usePermissions()
console.log('Can Create Tasks:', perms.canCreateTasks)
console.log('Can Manage Projects:', perms.canManageProjects)
console.log('Can Edit Tasks:', perms.canEditTasks)

// 4. Check role defaults
console.log('Role:', session?.user?.role)
```

**Expected Output for Employee with TASK_CREATE**:
```javascript
{
  canCreateTasks: true,  // ✓ From TASK_CREATE permission
  canManageProjects: false, // ✗ Not granted
  canEditTasks: true,    // ✓ From TASK_EDIT permission
  canViewAllTasks: false // ✗ Not granted
}
```

---

## Database Verification

### Check User Permissions in Database

```sql
-- View user permissions
SELECT 
  email, 
  role, 
  permissions,
  "organizationId"
FROM "User" 
WHERE email = 'test-employee@example.com';

-- Expected output:
-- email: test-employee@example.com
-- role: EMPLOYEE
-- permissions: ["TASK_CREATE", "TASK_EDIT", "TASK_VIEW"]
-- organizationId: (UUID)
```

### Update Permissions via Database

```sql
-- Grant TASK_CREATE permission
UPDATE "User" 
SET permissions = ARRAY['TASK_CREATE', 'TASK_EDIT', 'TASK_VIEW']
WHERE email = 'test-employee@example.com';

-- Verify update
SELECT email, permissions 
FROM "User" 
WHERE email = 'test-employee@example.com';
```

**Note**: User must log out and back in after database update!

---

## UI Component Testing

### Test Each UI Location

**1. Dashboard - Top Right**
- ✅ "New Project" button visible (if permitted)
- ✅ Button hidden (if not permitted)

**2. Tasks Page - Header**
- ✅ "New Project" button in header
- ✅ Filter options work

**3. Tasks Page - Empty States**
- ✅ "Create a New Project" button in empty assigned tasks
- ✅ "Create a New Project" button in empty created tasks
- ✅ Buttons hidden if no permission

**4. Calendar Page**
- ✅ "+" button to create task from calendar
- ✅ Quick create modal works
- ✅ Button hidden if no permission

**5. Sidebar - Create Menu**
- ✅ "New Project" option in create dropdown
- ✅ Option hidden if no permission

---

## Error Handling Tests

### Test 1: Session Expired
1. Log in successfully
2. Delete session cookie
3. Try to create task
4. **Expected**: Redirect to login

### Test 2: Invalid Permission
1. Manually modify permissions array in session
2. Try to create task
3. **Expected**: Server validates from database, denies

### Test 3: Concurrent Permission Change
1. User logged in with TASK_CREATE
2. Admin revokes TASK_CREATE
3. User tries to create task (without re-login)
4. **Expected**: Works until session expires (cached permissions)

---

## Performance Testing

### Check Permission Evaluation Speed

```javascript
// Run in console
console.time('Permission Check')
const perms = usePermissions()
console.log(perms.canCreateTasks)
console.timeEnd('Permission Check')

// Expected: < 5ms
```

### Check API Response Time

```bash
# Time the API request
time curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION" \
  -d '{"title": "Speed Test"}'

# Expected: < 500ms
```

---

## Regression Testing

### Verify Existing Functionality Still Works

**1. Super Admin**
- ✅ Still has all permissions
- ✅ Can create/edit/delete everything
- ✅ Can access all features

**2. Org Admin**  
- ✅ Can manage organization
- ✅ Can create tasks
- ✅ Can manage users
- ✅ Cannot access other organizations

**3. Manager**
- ✅ Can create tasks (role default)
- ✅ Can manage team's tasks
- ✅ Can invite users
- ✅ Cannot delete organization

**4. Existing Employees**
- ✅ Existing permissions still work
- ✅ Can still access assigned tasks
- ✅ No unintended permission loss

---

## Common Issues & Solutions

### Issue: Permission granted but not working
**Solution**:
1. User must log out completely
2. Clear browser cache
3. Log back in
4. Permissions loaded fresh from database

### Issue: "New Project" button not appearing
**Solution**:
1. Check `canCreateTasks` in console
2. Verify user has TASK_CREATE or PROJECT_MANAGE
3. Hard refresh page (Ctrl+Shift+R)
4. Check if UI is checking wrong permission

### Issue: API returns 403 despite UI allowing
**Solution**:
1. Check server-side permission logic
2. Verify user's actual permissions in database
3. Check session token is valid
4. Review API route.ts permission check

### Issue: Role changed but permissions didn't
**Solution**:
1. Custom permissions override role defaults
2. Remove custom permissions to use role defaults
3. Or keep custom permissions (they take precedence)

---

## Test Report Template

```
PERMISSION TESTING REPORT
Date: _______________
Tester: _______________

[ ] Test 1: Employee with TASK_CREATE - PASS/FAIL
[ ] Test 2: Employee without TASK_CREATE - PASS/FAIL  
[ ] Test 3: Manager with defaults - PASS/FAIL
[ ] Test 4: Employee with PROJECT_MANAGE - PASS/FAIL
[ ] Test 5: Client read-only - PASS/FAIL

Issues Found:
1. _______________
2. _______________

Notes:
_______________
```

---

## Automated Test Script

### Playwright Test Example

```typescript
test('Employee with TASK_CREATE can create tasks', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name=email]', 'test-employee@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  
  // Navigate to tasks
  await page.waitForURL('/dashboard')
  
  // Verify button exists
  await expect(page.locator('text=New Project')).toBeVisible()
  
  // Click to create
  await page.click('text=New Project')
  await page.waitForURL('/dashboard/tasks/new')
  
  // Fill form
  await page.fill('[name=title]', 'Test Task')
  await page.fill('[name=description]', 'Test Description')
  
  // Submit
  await page.click('button[type=submit]')
  
  // Verify success
  await expect(page.locator('text=Project Created')).toBeVisible()
})

test('Employee without TASK_CREATE cannot create tasks', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'test-employee-no-create@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  
  await page.waitForURL('/dashboard')
  
  // Button should NOT exist
  await expect(page.locator('text=New Project')).not.toBeVisible()
  
  // Direct navigation should redirect
  await page.goto('/dashboard/tasks/new')
  await page.waitForURL('/dashboard')
  
  // Error message should appear
  await expect(page.locator('text=permission')).toBeVisible()
})
```

---

Last Updated: December 5, 2025  
Test Version: 1.0
