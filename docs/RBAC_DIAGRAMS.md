# RBAC Permission Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Sidebar    │  │  Dashboard   │  │   Calendar   │          │
│  │              │  │              │  │              │          │
│  │ [+] Create   │  │ [+] New Task │  │ [+] Add Task │          │
│  │     Task     │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │ usePermissions  │                            │
│                  │     Hook        │                            │
│                  └────────┬────────┘                            │
│                           │                                     │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │ ProtectedButton │                            │
│                  │   Component     │                            │
│                  └────────┬────────┘                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │  Show/Hide/Disable    │
                │   based on permission │
                └───────────┬───────────┘
                            │
                            ▼
                    USER CLICKS BUTTON
                            │
                            ▼
┌───────────────────────────┴─────────────────────────────────────┐
│                        BACKEND API                              │
│                                                                 │
│  POST /api/tasks                                                │
│  POST /api/channels                                             │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ Authentication   │                                          │
│  │  Middleware      │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │ Get User Session │                                          │
│  │  with Permissions│                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │ requirePermission│                                          │
│  │   (Middleware)   │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ├─── ✅ Has Permission ──┐                          │
│           │                         │                          │
│           └─── ❌ No Permission     │                          │
│                       │              │                          │
│                       ▼              ▼                          │
│              ┌────────────┐   ┌─────────────┐                 │
│              │ 403 Error  │   │   Process   │                 │
│              │ Forbidden  │   │   Request   │                 │
│              └────────────┘   └─────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

## Permission Check Flow

```
User Action
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Frontend Permission Check            │
│    - usePermissions.can('TASK_CREATE')  │
│    - Merges role perms + user perms     │
└───────────┬─────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌──────────┐
│ ALLOWED │    │ DENIED   │
│ Show UI │    │ Hide/    │
│ Element │    │ Disable  │
└────┬────┘    └──────────┘
     │
     ▼ User clicks
┌─────────────────────────────────────────┐
│ 2. API Request Sent                     │
│    POST /api/tasks                      │
│    Authorization: Bearer {token}        │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ 3. Backend Permission Check             │
│    - Get user from session              │
│    - Parse user.permissions (JSON)      │
│    - Get DefaultRolePermissions[role]   │
│    - Merge both permission sets         │
│    - Check if has 'TASK_CREATE'         │
└───────────┬─────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌──────────┐    ┌─────────────┐
│ ✅ PASS  │    │ ❌ FAIL     │
│ 201      │    │ 403         │
│ Created  │    │ Forbidden   │
└──────────┘    └─────────────┘
```

## Permission Grant Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN WORKFLOW                         │
└─────────────────────────────────────────────────────────────┘

Admin logs in
    │
    ▼
Goes to User Management
    │
    ▼
Selects Employee
    │
    ▼
┌──────────────────────────────────────┐
│ UserPermissionsManager Component     │
│                                      │
│ GET /api/org-admin/users/{id}/perms  │
│                                      │
│ Current Permissions:                 │
│ ☐ TASK_CREATE                        │
│ ☐ TASK_DELETE                        │
│ ☐ CHANNEL_CREATE                     │
│                                      │
└──────────────────────────────────────┘
    │
    ▼
Admin checks "TASK_CREATE"
    │
    ▼
Admin clicks "Save"
    │
    ▼
┌──────────────────────────────────────┐
│ PATCH /api/org-admin/users/{id}/perms│
│                                      │
│ Body:                                │
│ {                                    │
│   "permissions": ["TASK_CREATE"]     │
│ }                                    │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ Backend Validation                   │
│                                      │
│ ✅ Admin has ORG_USERS_MANAGE        │
│ ✅ Target is same organization       │
│ ✅ Target is not another admin       │
│ ✅ Permissions are valid             │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ UPDATE User SET permissions =        │
│   '["TASK_CREATE"]'                  │
│ WHERE id = {userId}                  │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ Log Activity:                        │
│ "Admin granted TASK_CREATE to        │
│  employee@company.com"               │
└──────────────────────────────────────┘
    │
    ▼
Employee logs out & back in
    │
    ▼
┌──────────────────────────────────────┐
│ Session includes new permissions:    │
│ {                                    │
│   role: "EMPLOYEE",                  │
│   permissions: '["TASK_CREATE"]'     │
│ }                                    │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ usePermissions hook now returns:     │
│ canCreateTask = true ✅              │
└──────────────────────────────────────┘
    │
    ▼
Employee can now see & use
"Create Task" button
```

## Role Permission Matrix

```
┌──────────────────┬─────────┬─────────┬──────────────┬────────────────┐
│   PERMISSION     │  ADMIN  │ MANAGER │  EMPLOYEE    │ EMPLOYEE +PERM │
├──────────────────┼─────────┼─────────┼──────────────┼────────────────┤
│ TASK_CREATE      │    ✅    │    ✅    │      ❌       │       ✅        │
│ TASK_EDIT        │    ✅    │    ✅    │      ✅       │       ✅        │
│ TASK_VIEW        │    ✅    │    ✅    │      ✅       │       ✅        │
│ TASK_DELETE      │    ✅    │    ❌    │      ❌       │   ✅ (granted)  │
│ TASK_VIEW_ALL    │    ✅    │    ❌    │      ❌       │   ✅ (granted)  │
├──────────────────┼─────────┼─────────┼──────────────┼────────────────┤
│ CHANNEL_CREATE   │    ✅    │    ✅    │      ❌       │       ✅        │
│ CHANNEL_MANAGE   │    ✅    │    ❌    │      ❌       │   ✅ (granted)  │
│ CHANNEL_DELETE   │    ✅    │    ❌    │      ❌       │   ✅ (granted)  │
├──────────────────┼─────────┼─────────┼──────────────┼────────────────┤
│ ORG_USERS_MANAGE │    ✅    │    ❌    │      ❌       │       ❌        │
│ ORG_EDIT         │    ✅    │    ❌    │      ❌       │       ❌        │
└──────────────────┴─────────┴─────────┴──────────────┴────────────────┘

Legend:
  ✅ = Has permission by default
  ❌ = Does not have permission
  ✅ (granted) = Can be granted by admin
```

## Database Permission Storage

```
User Table
┌──────┬───────────────────┬──────────┬─────────────────────┬──────────────┐
│  ID  │       EMAIL       │   ROLE   │    PERMISSIONS      │ SUPER_ADMIN  │
├──────┼───────────────────┼──────────┼─────────────────────┼──────────────┤
│ u001 │ admin@co.com      │ ORG_ADMIN│ []                  │    false     │
│ u002 │ manager@co.com    │ MANAGER  │ []                  │    false     │
│ u003 │ emp1@co.com       │ EMPLOYEE │ []                  │    false     │
│ u004 │ emp2@co.com       │ EMPLOYEE │ ["TASK_CREATE"]     │    false     │
│ u005 │ emp3@co.com       │ EMPLOYEE │ ["TASK_CREATE",     │    false     │
│      │                   │          │  "CHANNEL_CREATE"]  │              │
└──────┴───────────────────┴──────────┴─────────────────────┴──────────────┘

Effective Permissions Calculation:
┌───────────────────────────────────────────────────────────────┐
│ user.effectivePermissions =                                   │
│   DefaultRolePermissions[user.role] ∪ JSON.parse(user.perms) │
└───────────────────────────────────────────────────────────────┘

Example for emp2@co.com (u004):
  Role permissions:    ["TASK_EDIT", "TASK_VIEW"]
  Explicit permissions: ["TASK_CREATE"]
  Effective:           ["TASK_EDIT", "TASK_VIEW", "TASK_CREATE"]
```

## UI Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      App Layout                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Sidebar                              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ usePermissions()                                │  │  │
│  │  │   ├─ canCreateTask                              │  │  │
│  │  │   └─ canCreateChannel                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  {canCreateTask && <Button>Create Task</Button>}     │  │
│  │  {canCreateChannel && <Button>Create Channel</Button>}  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Dashboard                            │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ ProtectedButton                                 │  │  │
│  │  │   permission="TASK_CREATE"                      │  │  │
│  │  │   ├─ usePermissions()                           │  │  │
│  │  │   ├─ can('TASK_CREATE') ──> true/false          │  │  │
│  │  │   └─ Show enabled / Show disabled with tooltip  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Admin: User Management                      │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ UserPermissionsManager                          │  │  │
│  │  │   ├─ GET /api/org-admin/users/{id}/permissions  │  │  │
│  │  │   ├─ Show checkboxes for each permission        │  │  │
│  │  │   └─ PATCH on save                              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   Security Layers                           │
└─────────────────────────────────────────────────────────────┘

Layer 1: Frontend (UX Layer)
┌───────────────────────────────────────┐
│ • usePermissions hook                 │
│ • ProtectedButton component           │
│ • Conditional rendering               │
│ Purpose: User Experience              │
│ Security: ❌ Can be bypassed          │
└───────────────────────────────────────┘
            │
            │ User can still call API directly
            ▼
Layer 2: API Authentication
┌───────────────────────────────────────┐
│ • Session validation                  │
│ • getSessionUserWithPermissions()     │
│ Purpose: Identify user                │
│ Security: ✅ Required                 │
└───────────────────────────────────────┘
            │
            ▼
Layer 3: Permission Authorization
┌───────────────────────────────────────┐
│ • requirePermission() middleware      │
│ • Parse user.permissions (JSON)       │
│ • Merge with DefaultRolePermissions   │
│ • Check required permission           │
│ Purpose: Enforce access control       │
│ Security: ✅ Primary defense          │
└───────────────────────────────────────┘
            │
            ▼
Layer 4: Database Validation
┌───────────────────────────────────────┐
│ • Verify organizationId match         │
│ • Validate input data                 │
│ • Transaction safety                  │
│ Purpose: Data integrity               │
│ Security: ✅ Defense in depth         │
└───────────────────────────────────────┘
            │
            ▼
Layer 5: Audit Logging
┌───────────────────────────────────────┐
│ • Log all permission changes          │
│ • Log all privileged actions          │
│ Purpose: Accountability & forensics   │
│ Security: ✅ Compliance               │
└───────────────────────────────────────┘
```

## Summary

- **Frontend checks** = UX optimization (hide irrelevant buttons)
- **Backend checks** = Security enforcement (prevent unauthorized actions)
- **Both layers required** for complete RBAC implementation
- **Permissions are additive**: Role perms + Explicit user perms
- **Admin can grant permissions** that override role defaults
- **All actions are logged** for audit trails
