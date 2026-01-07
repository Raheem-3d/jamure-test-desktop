import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkOrgAdmin, requirePermission } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"

/**
 * GET /api/org-admin/users/[userId]/permissions
 * Retrieve a user's explicit permissions
 */
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await getSessionUserWithPermissions()
    checkOrgAdmin(admin.role)
    
    const targetUser = await db.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        organizationId: true
      }
    })
    
    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }
    
    // Ensure same organization
    if (targetUser.organizationId !== admin.organizationId) {
      return NextResponse.json(
        { message: "Cannot view users from other organizations" },
        { status: 403 }
      )
    }
    
    let userPerms: Permission[] = []
    try {
      userPerms = JSON.parse(String(targetUser.permissions || '[]'))
    } catch {}
    
    return NextResponse.json({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      permissions: userPerms
    })
    
  } catch (error: any) {
    console.error('Get permissions error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to retrieve permissions' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH /api/org-admin/users/[userId]/permissions
 * Update a user's explicit permissions (Admin only)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await getSessionUserWithPermissions()
    checkOrgAdmin(admin.role)
    requirePermission(admin.role, 'ORG_USERS_MANAGE', admin.isSuperAdmin)
    
    const body = await req.json()
    const { permissions } = body
    
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { message: "Permissions must be an array" },
        { status: 400 }
      )
    }
    
    // Validate permissions - prevent granting super-admin or cross-org
    const ALLOWED_PERMISSIONS: Permission[] = [
      "ORG_VIEW",
      "PROJECT_MANAGE",
      "PROJECT_VIEW_ALL",
      "TASK_CREATE",
      "TASK_EDIT",
      "TASK_VIEW",
      "TASK_DELETE",
      "TASK_VIEW_ALL",
      "CHANNEL_CREATE",
      "CHANNEL_VIEW_ALL",
      "CHANNEL_MANAGE",
      "CHANNEL_DELETE",
      "REPORTS_VIEW",
    ]
    
    const invalid = permissions.filter(p => !ALLOWED_PERMISSIONS.includes(p))
    if (invalid.length > 0) {
      return NextResponse.json(
        { message: `Invalid permissions: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }
    
    const targetUser = await db.user.findUnique({
      where: { id: params.userId },
      select: { 
        id: true,
        organizationId: true, 
        role: true,
        name: true,
        email: true
      }
    })
    
    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }
    
    // Ensure same organization
    if (targetUser.organizationId !== admin.organizationId) {
      return NextResponse.json(
        { message: "Cannot modify users from other organizations" },
        { status: 403 }
      )
    }
    
    // Prevent modifying permissions of other admins or super admins
    if (targetUser.role === 'ORG_ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: "Cannot modify admin permissions through this endpoint" },
        { status: 403 }
      )
    }
    
    // Update permissions
    const updated = await db.user.update({
      where: { id: params.userId },
      data: {
        permissions: JSON.stringify(permissions)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true
      }
    })
    
    // Log activity
    await db.activityLog.create({
      data: {
        organizationId: admin.organizationId!,
        userId: admin.id,
        action: 'permissions_updated',
        details: {
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
          newPermissions: permissions
        }
      }
    }).catch((err: any) => console.error('Activity log error:', err))
    
    return NextResponse.json({
      message: "Permissions updated successfully",
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        permissions: JSON.parse(String(updated.permissions || '[]'))
      }
    })
    
  } catch (error: any) {
    console.error('Update permissions error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to update permissions' },
      { status: error.status || 500 }
    )
  }
}
