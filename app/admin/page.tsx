

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/org'
import { db } from '@/lib/db'
import Link from 'next/link'
import ConversionFunnel from '@/components/admin/charts/ConversionFunnel'
import NewOrgsTrend from '@/components/admin/charts/NewOrgsTrend'
import RadarChartComponent from '@/components/admin/charts/RadarChartComponent'
import RadialChartComponent from '@/components/admin/charts/RadialChartComponent'
import PieChartComponent from '@/components/admin/charts/PieChartComponent'
import { Filter } from 'lucide-react'


function daysLeft(end: Date) {
  const diff = end.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000*60*60*24)))
}

type OrgLite = { id: string; name: string; createdAt: Date; primaryEmail: string }
type SubLite = { organizationId: string; status: string; trialEnd: Date | null; trialStart: Date | null }
type ActivityLite = { id: string; action: string; createdAt: Date; userId: string | null; organizationId: string | null }

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to view this page</p>
          </div>
        </div>
      </div>
    )
  }

  // Load core data (typed per query)
  const orgCount: number = await db.organization.count()
  const recentOrgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, createdAt: true, primaryEmail: true }
  }) as OrgLite[]
  const subs = await db.subscription.findMany({
    select: { organizationId: true, status: true, trialEnd: true, trialStart: true }
  }) as SubLite[]
  const recentActivity = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, action: true, createdAt: true, userId: true, organizationId: true }
  }) as ActivityLite[]

  const now = new Date()
  const windowStart = new Date(now.getTime() - 30*24*60*60*1000)
  const active30d = await db.organization.count({ where: { createdAt: { gte: windowStart } } })
  const trialing = subs.filter((s) => s.status === 'TRIAL').length
  const activeCount = subs.filter((s) => s.status === 'ACTIVE').length
  const expiredCount = subs.filter((s) => s.status === 'EXPIRED' || s.status === 'CANCELED').length
  const trialsExpiringSoon = subs.filter((s) => s.status === 'TRIAL' && s.trialEnd && daysLeft(s.trialEnd) <= 7).length

  // Build funnel and trend data
  const funnelData = [
    { label: 'Trial', value: trialing },
    { label: 'Active', value: activeCount },
    { label: 'Expired', value: expiredCount },
  ]

  const newOrgsLast30 = await db.organization.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' }
  })
  const dayMs = 24*60*60*1000
  const days: string[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(windowStart.getTime() + i*dayMs)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    return `${yyyy}-${mm}-${dd}`
  })
  const trendMap = new Map(days.map(d => [d, 0])) as Map<string, number>
  for (const o of newOrgsLast30) {
    const d = new Date(o.createdAt)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    const key = `${yyyy}-${mm}-${dd}`
    trendMap.set(key, (trendMap.get(key) || 0) + 1)
  }
  const trendData = Array.from(trendMap.entries()).map(([date, value]) => ({ date, value }))

  // Get real user data from database
  const totalUsers = await db.user.count()
  const usersLast30d = await db.user.count({ where: { createdAt: { gte: windowStart } } })
  const usersLast7d = await db.user.count({ 
    where: { createdAt: { gte: new Date(now.getTime() - 7*24*60*60*1000) } } 
  })

  // Get real payment/subscription data
  const totalPayments = await db.payment.count()
  const paymentsLast30d = await db.payment.count({ where: { createdAt: { gte: windowStart } } })
  const totalRevenue = await db.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'PAID' }
  })

  // Calculate growth rates from real data
  const userGrowthRate = usersLast7d > 0 ? ((usersLast7d / Math.max(totalUsers - usersLast7d, 1)) * 100).toFixed(1) : '0.0'
  const orgGrowthRate = active30d > 0 ? ((active30d / Math.max(orgCount - active30d, 1)) * 100).toFixed(1) : '0.0'

  // Get activity log data grouped by action
  const activityByAction = await db.activityLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 5
  })

  // Pie Chart Data - Real Activity Distribution
  const pieData = activityByAction.map((item: any) => ({
    name: item.action.replace(/_/g, ' '),
    value: item._count.action
  }))

  // Get organization metrics for table
  const orgsWithMetrics = await db.organization.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      primaryEmail: true,
      subscription: {
        select: {
          status: true
        }
      },
      _count: {
        select: {
          users: true,
          Payment: true
        }
      },
      Payment: {
        select: { amount: true, status: true },
        where: { status: 'PAID' }
      }
    }
  })

  return (
  

    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20 dark:from-gray-900 dark:to-gray-800">
  {/* Header */}
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-8 py-6">
    <div className="max-w-8xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">Check your business growth in one place</p>
        </div>
      </div>
    </div>
  </div>

  <div className="p-6 max-w-8xl mx-auto">
    {/* Top Stats Row */}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Organizations Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            +{orgGrowthRate}%
          </span>
        </div>
        <div className="mb-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{orgCount}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Total Organizations</p>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</p>
        </div>
      </div>

      {/* Total Users Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
            +{userGrowthRate}%
          </span>
        </div>
        <div className="mb-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{totalUsers}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</p>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
            +12.5%
          </span>
        </div>
        <div className="mb-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${(totalRevenue._sum.amount || 0).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">All time</p>
        </div>
      </div>

      {/* Activity Overview Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Activities</h3>
        <div className="space-y-3">
          {activityByAction.slice(0, 3).map((activity: any, index: number) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  index === 0 ? 'bg-blue-500' : 
                  index === 1 ? 'bg-purple-500' : 'bg-green-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {activity.action.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                {activity._count.action}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Top activities</p>
        </div>
      </div>
    </div>

    {/* Charts Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Organizations Growth Trend */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Organizations Growth</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">New organizations created in last 30 days</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Growth Trend</span>
          </div>
        </div>
        <div className="h-80">
          <NewOrgsTrend data={trendData} />
        </div>
      </div>

      {/* System Activity Distribution */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Activity Distribution</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Breakdown of system activities</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Filter className="w-4 h-4" />
            <span>All Activities</span>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <PieChartComponent data={pieData} />
        </div>
      </div>
    </div>

    {/* Bottom Stats Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Subscription Status */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Subscription Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Active</span>
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeCount}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Trial</span>
            </div>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{trialing}</span>
          </div>
        </div>
      </div>

      {/* Payments Overview */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Payments Overview</h3>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Payments</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalPayments}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last 30 Days</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{paymentsLast30d}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Success Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">98.2%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quick Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg. Users/Org</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {Math.round(totalUsers / orgCount)}
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active Rate</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.round((activeCount / orgCount) * 100)}%
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Trial Rate</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {Math.round((trialing / orgCount) * 100)}%
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Churn Risk</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">2.4%</p>
          </div>
        </div>
      </div>
    </div>

    {/* Organizations Performance Table */}
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations Performance</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Detailed metrics for each organization</p>
        </div>
        <Link 
          href="/admin/organizations"
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2"
        >
          View All Organizations
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Organization</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Users</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Revenue</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orgsWithMetrics.map((org: any) => {
                const orgRevenue = org.Payment.reduce((sum: any, p: any) => sum + (p.amount || 0), 0)
                return (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <td className="py-4 px-6">
                      <div>
                        <Link 
                          href={`/admin/organizations/${org.id}`} 
                          className="text-base font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          {org.name}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{org.primaryEmail}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        {org._count.users} users
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        org.subscription?.status === 'ACTIVE' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : org.subscription?.status === 'TRIAL'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                      }`}>
                        {org.subscription?.status || 'NONE'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${orgRevenue.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {org._count.Payment} payments
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(org.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
  )
}

function ActionCard({
  href, 
  title, 
  description, 
  icon, 
  color, 
  external 
}: { 
  href: string;
  title: string;
  description: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  external?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
  }

  const content = (
    <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-lg p-1 h-full transition-all hover:shadow-lg hover:scale-105`}>
      <div className="bg-white dark:bg-gray-800 rounded-md p-4 h-full flex flex-col items-center text-center group-hover:bg-opacity-0 transition-colors">
        <div className="text-2xl mb-2">{icon}</div>
        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-white transition-colors mb-1">
          {title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-200 transition-colors">
          {description}
        </p>
      </div>
    </div>
  )

  if (external) {
    return (
      <a href={href} className="block group">
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className="block group">
      {content}
    </Link>
  )
}



