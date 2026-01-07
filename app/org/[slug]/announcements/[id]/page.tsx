import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

interface PageProps { params: { slug: string; id: string } }

export default async function OrgAnnouncementDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email) redirect('/login')

  // Resolve organization by slug or id param
  const slugOrId = params.slug
  const announcementId = params.id

  const organization = await db.organization.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true, name: true, slug: true }
  })
  if (!organization) return notFound()

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isSuperAdmin: true, organizationId: true }
  })
  if (!user) redirect('/login')

  const isMember = user.organizationId === organization.id
  const canView = isMember || user.isSuperAdmin
  if (!canView) return notFound()

  // Fetch announcement, allow GLOBAL scope or matching org
  const announcement = await db.announcement.findUnique({ where: { id: announcementId } })
  if (!announcement || (!announcement.organizationId && announcement.scope !== 'GLOBAL')) return notFound()
  if (announcement.scope === 'ORG' && announcement.organizationId !== organization.id) return notFound()

  // Check dismissal state
  const dismissed = await db.announcementDismissal.findUnique({
    where: { announcementId_userId: { announcementId: announcement.id, userId: user.id } },
    select: { id: true }
  })

  async function dismissAnnouncement(formData: FormData) {
    'use server'
    const aId = formData.get('announcementId') as string
    if (!aId) return
    const sessionInner = await getServerSession(authOptions as any) as any
    if (!sessionInner?.user?.email) return
    const current = await db.user.findUnique({ where: { email: sessionInner.user.email }, select: { id: true } })
    if (!current) return
    try {
      await db.announcementDismissal.upsert({
        where: { announcementId_userId: { announcementId: aId, userId: current.id } },
        update: {},
        create: { announcementId: aId, userId: current.id }
      })
    } catch {}
    redirect(`/org/${organization.slug || organization.id}/announcements`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcement Detail</h1>
        <Link href={`/org/${organization.slug || organization.id}/announcements`} className="text-sm text-blue-600 underline">All Announcements</Link>
      </div>
      <div className="border rounded p-5 bg-white dark:bg-gray-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{announcement.title}</h2>
          <span className="text-xs text-muted-foreground">{new Date(announcement.createdAt).toLocaleString()}</span>
        </div>
        {announcement.scope === 'GLOBAL' && (
          <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">GLOBAL</span>
        )}
        <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">{announcement.message}</p>
        {!dismissed ? (
          <form action={dismissAnnouncement}>
            <input type="hidden" name="announcementId" value={announcement.id} />
            <button className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700" type="submit">Dismiss</button>
          </form>
        ) : (
          <p className="text-xs text-green-600">You dismissed this announcement.</p>
        )}
      </div>
    </div>
  )
}