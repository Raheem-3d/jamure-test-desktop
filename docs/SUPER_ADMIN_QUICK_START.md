# Super Admin Dashboard - Quick Start Guide

## Accessing the Dashboard

### URL
Navigate to: `/superadmin`

### Requirements
- Must be logged in
- Must have super admin privileges (`isSuperAdmin: true` in session)

## Dashboard Overview

The Super Admin Dashboard has **6 main tabs**:

### 1️⃣ Overview
Quick statistics about your entire system:
- Total Organizations
- Total Users
- Active Projects
- Total Tasks

### 2️⃣ Organizations
Manage all organizations in the system.

**What you can do:**
- View all organizations
- See user and project counts
- Check subscription status
- Edit organization details
- Delete organizations

**Columns:**
- Organization Name
- Total Users
- Total Projects
- Subscription
- Created Date
- Actions (View, Edit, Delete)

### 3️⃣ People
Manage all users across all organizations.

**What you can do:**
- View complete user list
- See user roles and departments
- Check activity metrics (tasks, messages)
- Edit user profiles
- Delete user accounts

**Columns:**
- Name (with avatar)
- Email
- Organization
- Role
- Department
- Tasks Created
- Tasks Assigned
- Messages Sent
- Created Date
- Actions (Edit, Delete)

### 4️⃣ Projects
Manage all projects from all organizations.

**What you can do:**
- View all projects
- See assigned team members
- Check project status and priority
- View project deadlines
- Edit project details
- Delete projects

**Columns:**
- Title
- Description
- Organization
- Creator
- Assigned Members
- Stages
- Status
- Priority
- Deadline
- Created Date
- Actions (View, Edit, Delete)

**Special Features:**
- **Assigned Members**: Shows first 2 member avatars + count
- **Status Badge**: IN_PROGRESS is highlighted
- **Priority Badge**: URGENT shown in red

### 5️⃣ Tasks
Manage all tasks across all projects.

**What you can do:**
- View all tasks
- See task assignees
- Check task status and priority
- View deadlines
- Edit task details
- Delete tasks

**Columns:**
- Task Title
- Description
- Organization
- Project
- Creator
- Assignees
- Status
- Priority
- Deadline
- Created Date
- Actions (Edit, Delete)

**Special Features:**
- **Assignees Display**: Shows up to 3 avatars + count, or "Unassigned"
- **Status Badge**: IN_PROGRESS highlighted
- **Priority Badges**: 
  - URGENT = Red
  - HIGH = Default
  - Others = Secondary

### 6️⃣ Channels
Manage all communication channels.

**What you can do:**
- View all channels
- See channel members and messages
- Check public/private status
- Edit channel settings
- Delete channels

**Columns:**
- Channel Name
- Description
- Organization
- Creator
- Type (Public/Private)
- Members
- Messages
- Created Date
- Actions (Edit, Delete)

## Common Actions

### Edit Entity
1. Click the **Edit** button (pencil icon) in the Actions column
2. A modal/form will appear (coming soon - currently shows toast)
3. Update the desired fields
4. Save changes

### Delete Entity
1. Click the **Delete** button (trash icon) in the Actions column
2. Confirm deletion (confirmation dialog coming soon)
3. Entity and related data will be permanently deleted

### View Details
1. Click the **View** button (eye icon) where available
2. See comprehensive entity details
3. Navigate to detailed management page

## Understanding Visual Indicators

### Badges
- **Status Badges**:
  - Blue = IN_PROGRESS
  - Gray = Other statuses (TODO, DONE, etc.)

- **Priority Badges**:
  - Red = URGENT
  - Default = HIGH
  - Gray = MEDIUM/LOW

- **Channel Type**:
  - Default = Public
  - Gray = Private

- **Subscription**:
  - Green = ACTIVE
  - Yellow = TRIAL
  - Red = EXPIRED

### Avatars
- Show user profile pictures
- Fallback to first letter of name if no image
- Displayed for creators and assignees

### Icons
- 🏢 Building2 = Organizations
- 👥 Users = People/Members
- ✅ CheckCircle2 = Active/Completed
- ❌ XCircle = Inactive/Cancelled
- 📅 Calendar = Dates
- # Hash = Channels
- 💬 MessageSquare = Messages
- ✏️ Edit = Edit action
- 🗑️ Trash2 = Delete action
- 👁️ Eye = View action

## Data Relationships

### When you delete:

**Organization** ➜ Deletes:
- All organization users
- All organization projects
- All organization channels
- All organization tasks

**Project** ➜ Deletes:
- All project stages
- All project tasks
- All project assignments

**Task** ➜ Deletes:
- All task assignments
- All task comments

**Channel** ➜ Deletes:
- All channel members
- All channel messages

**User** ➜ Removes:
- User from channel memberships
- User from task assignments
- (Created content is preserved for audit trail)

## Tips & Best Practices

### 🔍 Finding Information
- Use browser's Ctrl+F to search tables
- Advanced search coming soon

### ⚠️ Before Deleting
- Verify the entity details
- Consider the cascade effects
- Backup important data if needed
- Confirmation dialogs coming soon

### 📊 Monitoring Activity
- Check the Overview tab for quick stats
- Review user activity (tasks created, messages sent)
- Monitor project statuses

### 🔐 Security
- Only perform actions you're authorized to do
- Be cautious with delete operations (they're permanent)
- Changes are logged for audit purposes

### 📱 UI Tips
- Hover over truncated text to see full content
- Click avatars/names for detailed views (coming soon)
- Use tab navigation to switch between sections

## Keyboard Shortcuts (Coming Soon)
- `Ctrl + K` - Quick search
- `Ctrl + /` - Show shortcuts
- `Tab` - Navigate between tabs
- `Esc` - Close modals

## Troubleshooting

### "Access Denied" or 403 Error
**Problem**: You're not recognized as a super admin
**Solution**: 
1. Check your user account has super admin privileges
2. Log out and log back in
3. Contact system administrator

### Data Not Loading
**Problem**: Tables are empty or showing loading state
**Solution**:
1. Refresh the page (F5)
2. Check your internet connection
3. Verify API endpoints are accessible
4. Check browser console for errors

### Edit/Delete Not Working
**Problem**: Actions don't complete
**Solution**:
1. Check for error toast messages
2. Verify you have network connection
3. Try refreshing the page
4. Check browser console for errors

### Missing Features
**Problem**: Edit forms don't appear
**Solution**: Some features are "coming soon" and will show toast notifications

## API Endpoints Reference

### Organizations
- List: `GET /api/superadmin/organizations`
- Get: `GET /api/superadmin/organizations/[orgId]`
- Update: `PATCH /api/superadmin/organizations/[orgId]`
- Delete: `DELETE /api/superadmin/organizations/[orgId]`

### Users
- List: `GET /api/superadmin/users`
- Get: `GET /api/superadmin/users/[userId]`
- Update: `PATCH /api/superadmin/users/[userId]`
- Delete: `DELETE /api/superadmin/users/[userId]`

### Projects
- List: `GET /api/superadmin/projects`
- Get: `GET /api/superadmin/projects/[projectId]`
- Update: `PATCH /api/superadmin/projects/[projectId]`
- Delete: `DELETE /api/superadmin/projects/[projectId]`

### Tasks
- List: `GET /api/superadmin/tasks`
- Get: `GET /api/superadmin/tasks/[taskId]`
- Update: `PATCH /api/superadmin/tasks/[taskId]`
- Delete: `DELETE /api/superadmin/tasks/[taskId]`

### Channels
- List: `GET /api/superadmin/channels`
- Get: `GET /api/superadmin/channels/[channelId]`
- Update: `PATCH /api/superadmin/channels/[channelId]`
- Delete: `DELETE /api/superadmin/channels/[channelId]`

### Statistics
- Get Stats: `GET /api/superadmin/stats`

## Support & Documentation

### Related Documentation
- [Complete Implementation Guide](./SUPER_ADMIN_DASHBOARD_COMPLETE.md)
- [Multi-Tenant RBAC](./MULTI_TENANT_RBAC.md)
- [Admin Dashboard](./ADMIN_DASHBOARD.md)

### Getting Help
1. Check this guide first
2. Review the complete implementation documentation
3. Check browser console for errors
4. Contact system administrator

## Feature Roadmap

### ✅ Completed
- Overview with system statistics
- Organizations management with CRUD
- People management with detailed info
- Projects management with team members
- Tasks management with assignees
- Channels management

### 🚧 Coming Soon
- Edit forms/modals for all entities
- Delete confirmation dialogs
- Advanced search and filtering
- Bulk operations
- Export to CSV/Excel
- Activity timeline
- Analytics charts
- Keyboard shortcuts

### 🔮 Future
- User impersonation
- System settings management
- Email template editor
- Backup/restore functionality
- Audit log viewer
- Performance analytics

---

**Last Updated**: 2024
**Version**: 1.0.0

**Quick Links**:
- Dashboard: `/superadmin`
- API Docs: `/api/superadmin/*`
- Related Docs: `/docs/`
