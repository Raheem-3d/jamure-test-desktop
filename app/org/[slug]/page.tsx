import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { hasPermission } from "@/lib/permissions"
import { isSuperAdmin as isSuperAdminEnv } from "@/lib/org"
import { cookies } from "next/headers"
import ConfirmDeleteUserForm from "@/components/confirm-delete-user-form"

function normalizeSlug(name: string, fallback: string) {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 48)
  return base || fallback
}

export default async function OrgDashboardPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email) redirect('/login')

  const slugOrId = params.slug

  // 1. Locate org first by slug then by id
  let organization = await db.organization.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    include: {
      users: { select: { id: true, name: true, email: true, role: true } },
    }
  })
  if (!organization) return notFound()

  // 2. If visited via raw id and slug is missing -> generate slug & redirect
  if (!organization.slug) {
    const desired = normalizeSlug(organization.name, organization.id.slice(0,8))
    let candidate = desired
    let i = 0
    while (true) {
      const exists = await db.organization.findUnique({ where: { slug: candidate } })
      if (!exists) break
      i += 1
      candidate = `${desired}-${i}`.slice(0,60)
    }
    organization = await db.organization.update({ where: { id: organization.id }, data: { slug: candidate }, include: { users: { select: { id:true,name:true,email:true,role:true } } } })
    if (slugOrId !== candidate) redirect(`/org/${candidate}`)
  }

  // 3. Current user details
  const currentUser = await db.user.findUnique({ where: { email: session.user.email }, select: { id:true, role:true, organizationId:true, isSuperAdmin:true } })
  if (!currentUser) redirect('/login')

  const isMember = currentUser.organizationId === organization.id
  const hasImpersonation = !!cookies().get('impersonation_org')?.value
  const isSuper = currentUser.isSuperAdmin || isSuperAdminEnv(session.user.email) || hasImpersonation
  const canView = isSuper || isMember
  if (!canView) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-sm text-muted-foreground">You don't have access to this organization.</p>
          <Link className="text-blue-600 underline" href="/">Go Home</Link>
        </div>
      </div>
    )
  }

  // Show the same dashboard as /dashboard for org URLs
  redirect('/dashboard')

  // 4. Aggregate counts (scoped)
  const [tasksCount, channelsCount] = await Promise.all([
    db.task.count({ where: { organizationId: organization.id } }),
    db.channel.count({ where: { organizationId: organization.id } }),
  ])

  // 5. Relevant announcements (global + org-specific) excluding dismissed
  const dismissed = await db.announcementDismissal.findMany({
    where: { userId: currentUser.id },
    select: { announcementId: true }
  })
  const dismissedIds = dismissed.map((d: any) => d.announcementId)
  const announcements = await db.announcement.findMany({
    where: {
      published: true,
      id: { notIn: dismissedIds },
      OR: [
        { scope: 'GLOBAL' },
        { scope: 'ORG', organizationId: organization.id }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const canManage = isSuper || (isMember && hasPermission(currentUser.role, 'ORG_USERS_MANAGE', isSuper))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link href={`/admin/organizations/${organization.id}`} className="px-3 py-2 rounded bg-gray-100 text-sm">Admin View</Link>
          )}
          {isSuper && (
            <Link href="/superadmin" className="px-3 py-2 rounded bg-gray-100 text-sm">Super Admin</Link>
          )}
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Announcements</h2>
          <div className="flex justify-end">
            <Link href={`/org/${organization.slug}/announcements`} className="text-xs text-blue-600 underline">View All</Link>
          </div>
          <ul className="space-y-2">
            {announcements.map((a: any) => (
              <li key={a.id} className="border rounded p-3 bg-white/60 dark:bg-gray-900/60 backdrop-blur flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Link href={`/org/${organization.slug}/announcements/${a.id}`} className="font-medium text-sm underline decoration-dotted underline-offset-2">{a.title}</Link>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{a.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  {a.scope === 'GLOBAL' && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">GLOBAL</span>
                  )}
                  <form action={async (formData: FormData) => {
                    'use server'
                    const aId = a.id
                    const sessionInner = await getServerSession(authOptions as any) as any
                    if (!sessionInner?.user?.email) return
                    const userInner = await db.user.findUnique({ where: { email: sessionInner.user.email }, select: { id: true } })
                    if (!userInner) return
                    await db.announcementDismissal.upsert({
                      where: { announcementId_userId: { announcementId: aId, userId: userInner.id } },
                      update: {},
                      create: { announcementId: aId, userId: userInner.id }
                    })
                  }}>
                    <button type="submit" className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">Dismiss</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded p-4">
          <p className="text-sm text-muted-foreground">People</p>
          <p className="text-2xl font-bold">{organization.users.length}</p>
          {canManage && (
            <Link href={`/org/${organization.slug}/people`} className="text-blue-600 underline text-sm">Manage</Link>
          )}
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-muted-foreground">Tasks</p>
          <p className="text-2xl font-bold">{tasksCount}</p>
          {canManage && (
            <Link href={`/org/${organization.slug}/tasks`} className="text-blue-600 underline text-sm">Manage</Link>
          )}
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-muted-foreground">Channels</p>
          <p className="text-2xl font-bold">{channelsCount}</p>
          {canManage && (
            <Link href={`/org/${organization.slug}/channels`} className="text-blue-600 underline text-sm">Manage</Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">People</h2>
        <ul className="space-y-1 text-sm">
          {organization.users.map((u: any) => (
            <li key={u.id} className="flex items-center justify-between">
              <span>{u.name || u.email} – {u.role}</span>
              {canManage && (
                <div className="flex gap-2">
                  <form action={`/api/org-admin/users/${u.id}`} method="post" className="flex items-center gap-2">
                    <select name="role" defaultValue={u.role} className="border rounded px-2 py-1 text-xs">
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ORG_ADMIN">ORG_ADMIN</option>
                    </select>
                    <input type="hidden" name="_method" value="PATCH" />
                    <button className="text-xs px-2 py-1 border rounded">Update</button>
                  </form>
                  <ConfirmDeleteUserForm actionUrl={`/api/org-admin/users/${u.id}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <form className="mt-4 border rounded p-3 space-y-2" action="/api/org-admin/users" method="post">
            <p className="font-medium text-sm">Add user to this organization</p>
            <div className="grid grid-cols-3 gap-2">
              <input className="border rounded px-2 py-1 text-sm" type="text" name="name" placeholder="Name" />
              <input className="border rounded px-2 py-1 text-sm" type="email" name="email" placeholder="Email" required />
              <select className="border rounded px-2 py-1 text-sm" name="role" defaultValue="EMPLOYEE">
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
              </select>
            </div>
            <button className="text-xs px-3 py-1 bg-blue-600 text-white rounded" type="submit">Add User</button>
          </form>
        )}
      </div>
    </div>
  )
}
