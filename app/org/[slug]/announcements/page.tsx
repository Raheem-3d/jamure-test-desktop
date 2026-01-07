import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"

interface PageProps { params: { slug: string }; searchParams?: { page?: string } }

export default async function OrgAnnouncementsPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email) redirect('/login')
  const slugOrId = params.slug

  let organization = await db.organization.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true, slug: true, name: true }
  })
  if (!organization) redirect('/login')

  const currentUser = await db.user.findUnique({ where: { email: session.user.email }, select: { id:true, role:true, organizationId:true, isSuperAdmin:true } })
  if (!currentUser) redirect('/login')
  const isMember = currentUser.organizationId === organization.id
  const canView = isMember || currentUser.isSuperAdmin
  if (!canView) {
    return <div className="p-6 text-sm">Access denied</div>
  }

  const page = Math.max(parseInt(searchParams?.page || '1', 10) || 1, 1)
  const PAGE_SIZE = 20
  const skip = (page - 1) * PAGE_SIZE

  const dismissed = await db.announcementDismissal.findMany({ where: { userId: currentUser.id }, select: { announcementId: true } })
  const dismissedIds = dismissed.map(d => d.announcementId)
  const [items, total] = await Promise.all([
    db.announcement.findMany({
      where: {
        published: true,
        id: { notIn: dismissedIds },
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ORG', organizationId: organization.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE
    }),
    db.announcement.count({
      where: {
        published: true,
        id: { notIn: dismissedIds },
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ORG', organizationId: organization.id }
        ]
      }
    })
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements – {organization.name}</h1>
        <Link href={`/org/${organization.slug}`} className="text-sm text-blue-600 underline">Back to Dashboard</Link>
      </div>

      <div className="space-y-3">
        {items.map(a => (
          <div key={a.id} className="border rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <Link href={`/org/${organization.slug || organization.id}/announcements/${a.id}`} className="font-semibold text-sm underline decoration-dotted underline-offset-2">{a.title}</Link>
              <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{a.message}</p>
            <div className="flex items-center gap-2 mt-2">
              {a.scope === 'GLOBAL' && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">GLOBAL</span>
              )}
              <form action={async () => {
                'use server'
                const sessionInner = await getServerSession(authOptions as any) as any
                if (!sessionInner?.user?.email) return
                const userInner = await db.user.findUnique({ where: { email: sessionInner.user.email }, select: { id: true } })
                if (!userInner) return
                await db.announcementDismissal.upsert({
                  where: { announcementId_userId: { announcementId: a.id, userId: userInner.id } },
                  update: {},
                  create: { announcementId: a.id, userId: userInner.id }
                })
              }}>
                <button type="submit" className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">Dismiss</button>
              </form>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground">No announcements found.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs mt-4">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}`} className="px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800">Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`?page=${page + 1}`} className="px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
