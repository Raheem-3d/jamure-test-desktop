import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkOrgAdmin, requirePermission } from "@/lib/permissions"

// PATCH /api/org-admin/users/[userId] - update user within own org
export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  try {
    const admin = await getSessionUserWithPermissions()
    checkOrgAdmin(admin.role)
    requirePermission(admin.role, 'ORG_USERS_MANAGE', admin.isSuperAdmin)
    if (!admin.organizationId) return NextResponse.json({ message: 'No org' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, organizationId: true } })
    if (!target || target.organizationId !== admin.organizationId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const { name, role, permissions } = body
    const updated = await db.user.update({ where: { id: params.userId }, data: { name: name || undefined, role: role || undefined, permissions: Array.isArray(permissions) ? permissions : undefined }, select: { id: true, name: true, email: true, role: true, permissions: true } })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Org-admin update user error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}

// DELETE /api/org-admin/users/[userId] - delete user within own org
export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  try {
    const admin = await getSessionUserWithPermissions()
    checkOrgAdmin(admin.role)
    requirePermission(admin.role, 'ORG_USERS_MANAGE', admin.isSuperAdmin)
    if (!admin.organizationId) return NextResponse.json({ message: 'No org' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, organizationId: true } })
    if (!target || target.organizationId !== admin.organizationId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    await db.user.delete({ where: { id: params.userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Org-admin delete user error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}

// POST override to support forms with _method=PATCH or DELETE
export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    const admin = await getSessionUserWithPermissions()
    checkOrgAdmin(admin.role)
    if (!admin.organizationId) return NextResponse.json({ message: 'No org' }, { status: 400 })
    const form = await req.formData().catch(() => null)
    const method = form?.get('_method') || 'PATCH'
    if (method === 'DELETE') {
      requirePermission(admin.role, 'ORG_USERS_MANAGE', admin.isSuperAdmin)
      const target = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, organizationId: true } })
      if (!target || target.organizationId !== admin.organizationId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
      }
      await db.user.delete({ where: { id: params.userId } })
      return NextResponse.json({ success: true })
    }
    // PATCH fallback
    requirePermission(admin.role, 'ORG_USERS_MANAGE', admin.isSuperAdmin)
    const target = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, organizationId: true } })
    if (!target || target.organizationId !== admin.organizationId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    const name = form?.get('name') || undefined
    const role = form?.get('role') || undefined
    let permissions: any = undefined
    try {
      const a = form?.getAll ? (form.getAll('permissions') as any[] || []) : []
      const b = form?.getAll ? (form.getAll('permissions[]') as any[] || []) : []
      const merged = [...a, ...b].filter(Boolean)
      permissions = merged.length ? Array.from(new Set(merged)) : undefined
    } catch (_) {
      permissions = undefined
    }
    const updated = await db.user.update({ where: { id: params.userId }, data: { name: name as any, role: role as any, permissions: permissions !== undefined ? permissions : undefined }, select: { id: true, name: true, email: true, role: true, permissions: true } })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Org-admin POST override error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}