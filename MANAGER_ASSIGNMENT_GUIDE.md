# Manager Assignment Implementation Guide

## ✅ Completed

### 1. **User Creation Form** (`org-add-user-form.tsx`)
- Added manager selection dropdown when creating users
- Fetches available managers from `/api/org-admin/managers`
- Sends `managerId` with user creation request

### 2. **Database Schema** (`prisma/schema.prisma`)
- Added `managerId` field to User model
- Added relationship: `manager` (User?) and `subordinates` (User[])
- Enables self-referential manager-subordinate relationship

### 3. **API Endpoints**

#### `/api/org-admin/managers` (GET)
- Lists all MANAGER role users in organization
- Returns: id, name, email, role
- Used by form to populate manager dropdown

#### `/api/org-admin/users` (POST)
- Updated to accept `managerId` parameter
- Validates manager belongs to same organization
- Creates user with manager assignment

#### `/api/org-admin/users` (GET)
- Added `managerId` to selection
- Added `subordinates` count for dashboard visibility

#### `/api/users/my-team` (GET)
- **New endpoint for manager visibility**
- Managers get only their subordinates
- Org admins get all users
- Employees get empty list
- Supports search filtering

## 🔧 Still Needed (Integration Points)

### 1. **Task Assignment** 
When creating/assigning tasks, filter assignees:
```typescript
// For managers: use /api/users/my-team endpoint
// Only show their subordinates in dropdown
const getAssignableUsers = async () => {
  if (currentUser.role === "MANAGER") {
    const res = await fetch("/api/users/my-team")
    return res.json()
  } else if (currentUser.role === "ORG_ADMIN") {
    const res = await fetch("/api/org-admin/users")
    return res.json()
  }
}
```

### 2. **Channel Member Selection**
Update channel member invitation/selection:
```typescript
// Use same /api/users/my-team endpoint
// Managers can only add their subordinates to channels
```

### 3. **Project Assignment**
Similar to tasks - use `/api/users/my-team` for managers

### 4. **API Protection**
In task/project/channel creation endpoints, add validation:
```typescript
// Verify assignee belongs to user's team if user is MANAGER
if (creatingUser.role === "MANAGER") {
  const assignee = await db.user.findUnique({ where: { id: assigneeId } })
  if (assignee.managerId !== creatingUser.id) {
    throw new Error("Cannot assign to users outside your team")
  }
}
```

## 📋 Checklist for Complete Implementation

- [ ] Update task creation form to use `/api/users/my-team` for manager selection
- [ ] Update task assignment endpoint to validate manager restrictions
- [ ] Update channel member selection to filter by team
- [ ] Update channel creation API to validate member assignments
- [ ] Update project/task list endpoints to filter by team (if manager)
- [ ] Add manager visibility check in people/team page
- [ ] Test manager can only see and manage their team members
- [ ] Run migration: `npx prisma migrate dev --name add-manager-field`

## 🚀 Next Steps

1. **Run Database Migration**
```bash
npx prisma migrate dev --name add-manager-field
```

2. **Update Form Components**
- Update task creation form
- Update channel creation form  
- Update project creation form
- Filter assignee/member selects based on user role

3. **Update API Endpoints**
- Task creation/assignment
- Channel management
- Project management
- Add role-based filtering throughout

4. **Test End-to-End**
- Create manager with subordinates
- Verify manager sees only own team
- Verify manager can only assign tasks to own team
- Verify org admin sees all users
- Verify employees have no visibility

