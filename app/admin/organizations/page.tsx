import React from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/org"
import { db } from "@/lib/db"
import Link from "next/link"

export default async function AdminOrganizationsPage({ searchParams }: { searchParams?: { q?: string; sort?: string; dir?: string } }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return <div className="p-8 text-red-600">Forbidden</div>
  }
  const q = (searchParams?.q || '').trim()
  const sort = (searchParams?.sort || 'createdAt') as any
  const dir = (searchParams?.dir === 'asc' ? 'asc' : 'desc') as any
  
  const orgs = await db.organization.findMany({
    where: q ? {
      OR: [
        { name: { contains: q } },
        { slug: { contains: q } },
        { primaryEmail: { contains: q } },
        { id: q }
      ]
    } : {},
    orderBy: { [sort]: dir },
    include: { 
      subscription: true, 
      _count: { 
        select: { 
          users: true,
          Payment: true,
          Task: true,
          Channel: true
        } 
      } 
    },
    take: 50
  })

  // Calculate statistics
  const totalOrgs = orgs.length
  const activeOrgs = orgs.filter((o: any) => o.subscription?.status === 'ACTIVE').length
  const trialOrgs = orgs.filter((o: any) => o.subscription?.status === 'TRIAL').length
  const suspendedOrgs = orgs.filter((o: any) => o.suspended).length
  const totalUsers = orgs.reduce((sum: number, o: any) => sum + o._count.users, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all platform organizations and their subscriptions</p>
          </div>
          <div className="flex gap-2">
            <Link 
              href="/superadmin"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Super Admin Dashboard
            </Link>
            <Link 
              href="/admin"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Admin Home
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrgs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeOrgs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Trial</p>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{trialOrgs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Suspended</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{suspendedOrgs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <form className="flex gap-3">
            <div className="flex-1">
              <input 
                name="q" 
                defaultValue={q} 
                placeholder="Search by name, email, or ID..." 
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white" 
              />
            </div>
            <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm">
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </form>
        </div>

        {/* Organizations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    <Link href={`?${(() => { const p = new URLSearchParams(); if (q) p.set('q', q); p.set('sort','name'); p.set('dir', dir==='asc' ? 'desc' : 'asc'); return p.toString(); })()}`} className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
                      Organization
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </Link>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Users</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Tasks</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Channels</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Payments</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    <Link href={`?${(() => { const p = new URLSearchParams(); if (q) p.set('q', q); p.set('sort','createdAt'); p.set('dir', dir==='asc' ? 'desc' : 'asc'); return p.toString(); })()}`} className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
                      Created
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </Link>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Trial Ends</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o: any) => (
                  <tr key={o.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <Link href={`./organizations/${o.id}`} className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                          {o.name}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{o.primaryEmail}</p>
                        {o.suspended && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mt-1">
                            SUSPENDED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        {o._count.users}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        {o._count.Task}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        {o._count.Channel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                        {o._count.Payment}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={o.subscription?.status} />
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                      {o.subscription?.trialEnd ? new Date(o.subscription.trialEnd).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <form action={`/api/admin/organizations/${o.id}/impersonate`} method="post">
                          <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-medium transition-all shadow-sm hover:shadow">
                            Impersonate
                          </button>
                        </form>
                        <Link href={`/${o.slug || o.id}`} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-xs font-medium transition-all shadow-sm hover:shadow">
                          Org Dashboard
                        </Link>
                        <Link href={`./organizations/${o.id}`} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium transition-all shadow-sm hover:shadow">
                          Admin Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        

          {orgs.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No organizations found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const styles = {
    TRIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    CANCELED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}
