# Employee Permission Debugging Guide (اردو + English)

## مسئلہ / Problem
Employee ko **koi permission nahi hai** lekin phir bhi sidebar mein "Create Project/Channel" button dikhta hai.

---

## فوری حل / Quick Fix

### Step 1: Employee کو Logout کریں
**ZAROORI HAI** - Employee user ko logout aur phir login karna padega kyunki:
- Session browser mein **cache** hota hai
- Permission changes ke baad session **automatically refresh nahi** hota
- Logout karne se **naya session** banta hai database se

#### Kaise karein:
1. Employee user se login karein
2. Profile/Settings par click karein
3. **Sign Out** / **Logout** button dabayein
4. Phir se login karein employee credentials se
5. Ab sidebar check karein - create buttons **nahi dikhne chahiye**

---

### Step 2: Browser Console Check کریں

Employee user login karne ke baad:

1. Browser mein **F12** ya **Right-click → Inspect** karein
2. **Console** tab kholen
3. Permission checks ke logs dikhengy (development mode mein):

```
[Permission Check] TASK_CREATE: {role: "EMPLOYEE", isSuperAdmin: false, userPermissions: [], result: false}
[Permission Check] CHANNEL_CREATE: {role: "EMPLOYEE", isSuperAdmin: false, userPermissions: [], result: false}
```

#### ✅ Sahi Output (Correct)
```javascript
{
  role: "EMPLOYEE",
  isSuperAdmin: false,
  userPermissions: [],   // Empty array
  result: false         // Button HIDE hoga
}
```

#### ❌ Galat Output (Wrong)
```javascript
{
  role: "EMPLOYEE", 
  userPermissions: ["TASK_CREATE"],  // Yeh nahi hona chahiye
  result: true  // Button dikha raha hai!
}
```

---

### Step 3: Session Data Manually Check کریں

Browser console mein yeh command run karein:

```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(session => {
    console.log('Current Session:', session);
    console.log('User Role:', session.user.role);
    console.log('User Permissions:', session.user.permissions);
    console.log('Is SuperAdmin:', session.user.isSuperAdmin);
  });
```

**Expected Output for Employee with NO permissions:**
```json
{
  "user": {
    "id": "usr_xyz123",
    "email": "employee@company.com",
    "role": "EMPLOYEE",
    "permissions": [],           // ⚠️ Empty array hona chahiye
    "isSuperAdmin": false,       // ⚠️ False hona chahiye
    "organizationId": "org_123"
  }
}
```

---

## Database Check کریں / Check Database

Agar logout/login ke baad bhi button dikha raha hai, toh database check karein:

### MySQL Query:
```sql
SELECT 
  id, 
  email, 
  name, 
  role, 
  permissions, 
  isSuperAdmin,
  organizationId
FROM User 
WHERE email = 'employee@company.com';
```

### ✅ Sahi Values (Employee with NO permissions)
```
role: "EMPLOYEE"
permissions: NULL  ya  "[]"  ya  []
isSuperAdmin: NULL  ya  0  ya  false
```

### ❌ Galat Values (Problem hai!)
```
permissions: "[\"TASK_CREATE\"]"    ← Yeh remove karna hoga
permissions: "[\"CHANNEL_CREATE\"]" ← Yeh bhi remove karna hoga
isSuperAdmin: 1                     ← Yeh false hona chahiye
```

---

## Fix Database Directly (اگر ضرورت ہو)

Agar database mein galat permissions hain, toh yeh query run karein:

```sql
-- Remove ALL permissions from specific employee
UPDATE User 
SET permissions = '[]', 
    isSuperAdmin = 0
WHERE email = 'employee@company.com';
```

**Note:** Query run karne ke baad employee ko **logout aur login** karna padega.

---

## Common Mistakes (عام غلطیاں)

### ❌ Galti #1: User Login hai (Browser cache)
- **Fix:** Logout → Login karein

### ❌ Galti #2: Browser cache purana hai
- **Fix:** Browser cache clear karein:
  - `Ctrl + Shift + Delete` (Windows)
  - `Cmd + Shift + Delete` (Mac)
  - Ya hard refresh: `Ctrl + F5`

### ❌ Galti #3: Development server restart nahi hui
- **Fix:** Server restart karein:
  ```bash
  # Terminal mein
  Ctrl + C  (server band karein)
  npm run dev  (phir se start karein)
  ```

### ❌ Galti #4: Database mein permissions hai
- **Fix:** Upar wali SQL query se fix karein

---

## Testing Checklist

Check karein yeh sab:

- [ ] Employee user **logout** kar diya
- [ ] Employee user **login** kar diya (fresh session)
- [ ] Browser console check kiya (F12)
- [ ] Console mein `[Permission Check]` logs dikhe
- [ ] `result: false` dikha TASK_CREATE ke liye
- [ ] `result: false` dikha CHANNEL_CREATE ke liye
- [ ] Sidebar mein create buttons **nahi dikhe**
- [ ] Dashboard mein create buttons **nahi dikhe**

---

## Still Not Working? (پھر بھی کام نہیں کر رہا؟)

Agar sab kuch try karne ke baad bhi problem hai:

### 1. Check `lib/permissions.ts`
```typescript
EMPLOYEE: ["TASK_EDIT", "TASK_VIEW"],  // ✅ Yeh hona chahiye
// NOT: ["TASK_CREATE", "TASK_EDIT", "TASK_VIEW"]  ❌
```

### 2. Check `lib/rbac-utils.ts`
Console logs dekho development mode mein:
```typescript
console.log(`[Permission Check] ${permission}:`, {
  role: user.role,
  isSuperAdmin: user.isSuperAdmin,
  userPermissions,
  result
})
```

### 3. NextAuth Session Check
File: `lib/auth.ts` - Line 69
```typescript
s.user.permissions = (token as any).permissions || []
```
Yeh **array** hona chahiye, **string nahi**.

### 4. API Endpoint Test
Directly API test karein browser console se:

```javascript
// Try creating a task as Employee (should FAIL with 403)
fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    title: 'Test Task',
    description: 'Testing permissions'
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected Response:**
```json
{
  "message": "Forbidden: You need TASK_CREATE permission to create tasks"
}
```
Status: **403 Forbidden**

Agar yeh **403** nahi aa raha aur **201 Created** aa raha hai, toh **backend mein problem hai**.

---

## Admin se Permission Grant کیسے کریں

Agar aap employee ko permission dena chahte hain:

### Option 1: Database se directly
```sql
UPDATE User 
SET permissions = '["TASK_CREATE"]'
WHERE email = 'employee@company.com';
```

### Option 2: Admin UI se (future)
1. Admin user se login karein
2. Users management page par jao
3. Employee select karein
4. Permissions grant/revoke karein
5. Save karein

**Important:** Permission change ke baad employee ko **logout aur login** karna padega.

---

## Expected Behavior (صحیح رویہ)

### Employee WITHOUT Permissions:
- ❌ Cannot see "Create Project" button
- ❌ Cannot see "Create Channel" button  
- ✅ Can see assigned tasks
- ✅ Can edit their own tasks
- ✅ Can view public channels

### Employee WITH Granted TASK_CREATE:
- ✅ Can see "Create Project" button
- ❌ Cannot see "Create Channel" button (not granted)
- ✅ Can create tasks via API
- ✅ Can see "Created by Me" tab

### Manager (Default):
- ✅ Can see "Create Project" button
- ✅ Can see "Create Channel" button
- ✅ All creation permissions by default

### ORG_ADMIN:
- ✅ Can see ALL buttons
- ✅ Can grant/revoke permissions
- ✅ Can manage users

---

## Contact for Help

Agar problem solve nahi hui:

1. Browser console screenshot bhejein
2. Database query result bhejein  
3. User role aur permissions JSON share karein

---

**Last Updated:** December 6, 2025
