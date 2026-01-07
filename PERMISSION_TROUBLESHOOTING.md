# Permission Troubleshooting Guide

## Issue: Employee Can Still See Create Buttons

### Root Cause
The most common cause is that the **user session is cached** and hasn't been refreshed after the permission changes were applied.

### Quick Fix Steps

#### 1. **Force Session Refresh** (Recommended)
The employee user needs to log out and log back in:

1. Click the user profile/settings
2. Click "Sign Out"
3. Log back in with the employee credentials
4. The permissions should now be properly enforced

#### 2. **Clear Browser Data** (If logout doesn't work)
1. Open browser DevTools (F12)
2. Go to Application → Storage
3. Click "Clear site data"
4. Refresh the page and log in again

#### 3. **Verify User Configuration in Database**

Check the user record in your database:

```sql
SELECT id, name, email, role, permissions, isSuperAdmin 
FROM User 
WHERE email = 'employee@example.com';
```

Expected values for a restricted employee:
- `role`: `'EMPLOYEE'`
- `permissions`: `[]` or `NULL` (empty array)
- `isSuperAdmin`: `false` or `NULL`

### Debug in Browser Console

With the employee user logged in, open browser console (F12) and type:

```javascript
// Check session data
console.log('Session:', await fetch('/api/auth/session').then(r => r.json()))
```

Expected output for EMPLOYEE with no extra permissions:
```json
{
  "user": {
    "id": "...",
    "email": "employee@example.com",
    "role": "EMPLOYEE",
    "permissions": [],
    "isSuperAdmin": false
  }
}
```

### Permission Checks (Development Mode)

In development, permission checks are now logged to console. Open the browser console and you'll see:

```
[Permission Check] TASK_CREATE: {role: "EMPLOYEE", isSuperAdmin: false, userPermissions: [], result: false}
[Permission Check] CHANNEL_CREATE: {role: "EMPLOYEE", isSuperAdmin: false, userPermissions: [], result: false}
```

- `result: false` = Button should be HIDDEN ✅
- `result: true` = Button should be VISIBLE ⚠️

### Expected Behavior by Role

#### EMPLOYEE (No Extra Permissions)
- ❌ Cannot create tasks
- ❌ Cannot create channels
- ✅ Can edit tasks assigned to them
- ✅ Can view tasks assigned to them
- ❌ Cannot see ALL organization tasks
- ✅ Can see public channels
- ✅ Can see channels they're a member of
- ❌ Cannot see ALL organization channels

#### MANAGER
- ✅ Can create tasks
- ✅ Can create channels
- ✅ Can edit tasks
- ✅ Can view all tasks in their scope
- ✅ Can manage projects

#### ORG_ADMIN
- ✅ Can create tasks
- ✅ Can create channels
- ✅ Can view ALL organization tasks
- ✅ Can view ALL organization channels
- ✅ Can manage users
- ✅ Can grant/revoke permissions

### Granting Permissions to an Employee

If you want to give an employee the ability to create tasks/channels:

1. Log in as ORG_ADMIN
2. Go to Users management
3. Select the employee
4. Grant specific permissions:
   - `TASK_CREATE` - Allow creating tasks
   - `CHANNEL_CREATE` - Allow creating channels
   - `TASK_VIEW_ALL` - See all organization tasks
   - `CHANNEL_VIEW_ALL` - See all organization channels
5. Employee must log out and log back in

### Backend API Protection

Even if the frontend shows the button (due to session cache), the backend API will reject unauthorized requests:

```
POST /api/tasks
Response: 403 Forbidden
{
  "message": "Forbidden: You need TASK_CREATE permission to create tasks"
}
```

This ensures security even if the UI is temporarily out of sync.

### Channel Visibility Issue

If the employee can see ALL channels:

**Check #1: Is CHANNEL_VIEW_ALL granted?**
```javascript
// In browser console
const session = await fetch('/api/auth/session').then(r => r.json())
console.log('Has CHANNEL_VIEW_ALL:', session.user.permissions.includes('CHANNEL_VIEW_ALL'))
```

**Check #2: Are all channels public?**
- Employees can see public channels by design
- Only private channels require membership

**Check #3: Is the employee a member?**
- Employees automatically see channels they're added to
- Check channel membership in the database

### Common Mistakes

1. **Creating user while logged in as employee** - Session doesn't auto-refresh
2. **Testing without logging out** - Old session persists
3. **Expecting instant UI updates** - Frontend uses session cache
4. **Granting CLIENT role instead of EMPLOYEE** - CLIENT has different permissions

### Testing Checklist

- [ ] User created with role = 'EMPLOYEE'
- [ ] User permissions field is empty or null
- [ ] User is NOT marked as isSuperAdmin
- [ ] Employee user logged OUT completely
- [ ] Employee user logged BACK IN
- [ ] Browser console shows correct session data
- [ ] Create task button is hidden in sidebar
- [ ] Create channel button is hidden in sidebar
- [ ] Employee can only see assigned tasks
- [ ] Employee can only see public channels + member channels

---

## Still Not Working?

If you've tried all the above and permissions still aren't working:

1. Restart the development server
2. Clear Next.js cache: `rm -rf .next`
3. Check for TypeScript/build errors
4. Verify `lib/permissions.ts` has correct DefaultRolePermissions
5. Check browser network tab for 403 errors on API calls

