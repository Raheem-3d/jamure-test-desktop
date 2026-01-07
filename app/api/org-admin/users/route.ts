import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkOrgAdmin, requirePermission } from "@/lib/permissions"

// GET /api/org-admin/users - list users in caller's organization; ORG_ADMIN only
export async function GET(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkOrgAdmin(user.role)
    if (!user.organizationId) {
      return NextResponse.json([], { status: 200 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const where: any = { organizationId: user.organizationId }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
        role: true,
        organizationId: true,
        managerId: true,
        createdAt: true,
        _count: {
          select: {
            createdTasks: true,
            assignedTasks: true,
            sentMessages: true,
            subordinates: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Org-admin users list error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}

// POST /api/org-admin/users - create user inside own organization
export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkOrgAdmin(user.role)
    requirePermission(user.role, 'ORG_USERS_MANAGE', user.isSuperAdmin)
    if (!user.organizationId) {
      const err: any = new Error('No organization bound to admin')
      err.status = 400
      throw err
    }
    let name: any, email: any, role: any, password: any, departmentId: any, managerId: any
    const contentType = req.headers.get('content-type') || ''
    let explicitPermissions: any = undefined
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      name = fd.get('name')
      email = fd.get('email')
      role = fd.get('role') || 'EMPLOYEE'
      password = fd.get('password')
      departmentId = fd.get('departmentId') || null
      managerId = fd.get('managerId') || null
      // collect permissions from repeated form fields `permissions[]`
      try {
        const a = fd.getAll ? (fd.getAll('permissions') as any[] || []) : []
        const b = fd.getAll ? (fd.getAll('permissions[]') as any[] || []) : []
        const merged = [...a, ...b].filter(Boolean)
        explicitPermissions = merged.length ? Array.from(new Set(merged)) : undefined
      } catch (_) {
        explicitPermissions = undefined
      }
    } else {
      const data = await req.json()
      name = data?.name
      email = data?.email
      role = data?.role || 'EMPLOYEE'
      password = data?.password
      departmentId = data?.departmentId || null
      managerId = data?.managerId || null
      explicitPermissions = Array.isArray(data?.permissions) ? data.permissions : undefined
    }
    if (!email) {
      return NextResponse.json({ message: 'Email required' }, { status: 400 })
    }
    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(password || 'ChangeMe123!', 10)
    // Validate department exists (Department is global; no org linkage in schema)
    if (departmentId) {
      const dept = await db.department.findUnique({ where: { id: String(departmentId) }, select: { id: true } })
      if (!dept) departmentId = null
    }
    // Validate manager exists and belongs to same organization
    if (managerId) {
      const mgr = await db.user.findUnique({ 
        where: { id: String(managerId) },
        select: { id: true, organizationId: true }
      })
      if (!mgr || mgr.organizationId !== user.organizationId) managerId = null
    }

    const created = await db.user.create({
      data: {
        name: name || null,
        email,
        password: hashed,
        role,
        permissions: explicitPermissions !== undefined ? explicitPermissions : undefined,
        organization: {
          connect: { id: user.organizationId }
        },
        ...(departmentId && { department: { connect: { id: String(departmentId) } } }),
        ...(managerId && { manager: { connect: { id: String(managerId) } } }),
      },
      select: { id: true, name: true, email: true, role: true, organizationId: true, departmentId: true, managerId: true, createdAt: true, permissions: true }
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('Org-admin create user error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}