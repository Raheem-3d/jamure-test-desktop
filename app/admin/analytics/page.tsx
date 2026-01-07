import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/org'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, AlertCircle, BarChart3, PieChart } from 'lucide-react'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">Access Denied</CardTitle>
            <CardDescription>You don't have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const [totalTrials, totalActive, totalExpired, totalCanceled] = await Promise.all([
    db.subscription.count({ where: { status: 'TRIAL' } }),
    db.subscription.count({ where: { status: 'ACTIVE' } }),
    db.subscription.count({ where: { status: 'EXPIRED' } }),
    db.subscription.count({ where: { status: 'CANCELED' } })
  ])

  const totalOrgs = await db.organization.count()
  const totalUsers = await db.user.count()
  const totalTasks = await db.task.count()
  const totalChannels = await db.channel.count()

  const totalTrialsAllTime = totalTrials + totalActive + totalExpired + totalCanceled
  const conversionRate = totalTrialsAllTime > 0 ? Math.round((totalActive / totalTrialsAllTime) * 100) : 0

  // MRR: sum of PAID payments in last 30 days
  const since = new Date(Date.now() - 30*24*60*60*1000)
  const payments = await db.payment.findMany({ 
    where: { status: 'PAID', createdAt: { gte: since } }, 
    select: { amount: true } 
  })
  const mrr = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) / 100 // Convert from cents

  const avgUsersPerOrg = totalOrgs > 0 ? Math.round(totalUsers / totalOrgs) : 0
  const avgTasksPerOrg = totalOrgs > 0 ? Math.round(totalTasks / totalOrgs) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Platform performance and key business metrics
            </p>
          </div>
          <Badge variant="outline" className="px-4 py-2">
            <Activity className="w-3 h-3 mr-2" />
            Live Data
          </Badge>
        </div>

        {/* Primary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            label="Active Trials" 
            value={totalTrials} 
            icon={<Users className="w-5 h-5" />}
            trend={totalTrials > 0 ? "up" : "neutral"}
            gradient="from-blue-500 to-blue-600"
            iconBg="bg-blue-100 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <MetricCard 
            label="Paid Subscriptions" 
            value={totalActive} 
            icon={<TrendingUp className="w-5 h-5" />}
            trend="up"
            gradient="from-green-500 to-emerald-600"
            iconBg="bg-green-100 dark:bg-green-900/20"
            iconColor="text-green-600 dark:text-green-400"
          />
          <MetricCard 
            label="Conversion Rate" 
            value={`${conversionRate}%`} 
            icon={<PieChart className="w-5 h-5" />}
            trend={conversionRate >= 50 ? "up" : "down"}
            gradient="from-purple-500 to-purple-600"
            iconBg="bg-purple-100 dark:bg-purple-900/20"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <MetricCard 
            label="MRR (30d)" 
            value={mrr > 0 ? `$${mrr.toLocaleString()}` : '$0'} 
            icon={<DollarSign className="w-5 h-5" />}
            trend={mrr > 0 ? "up" : "neutral"}
            gradient="from-amber-500 to-orange-600"
            iconBg="bg-amber-100 dark:bg-amber-900/20"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Subscription Status Breakdown */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Subscription Status
            </CardTitle>
            <CardDescription>Distribution of subscription states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <StatusCard label="Trial" count={totalTrials} color="blue" />
              <StatusCard label="Active" count={totalActive} color="green" />
              <StatusCard label="Expired" count={totalExpired} color="red" />
              <StatusCard label="Canceled" count={totalCanceled} color="gray" />
            </div>
          </CardContent>
        </Card>

        {/* Platform Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Organizations</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalOrgs}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{avgUsersPerOrg} avg users/org</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Total Users</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span>Platform-wide</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Total Tasks</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalTasks}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                <span>{avgTasksPerOrg} avg tasks/org</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Total Channels</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalChannels}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span>Communication hubs</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Total Revenue (30d)</CardDescription>
              <CardTitle className="text-3xl font-bold">${mrr.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>Monthly recurring</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Health Score</CardDescription>
              <CardTitle className="text-3xl font-bold">{conversionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PieChart className="w-4 h-4" />
                <span>Trial conversion</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Insights */}
        <Card className="shadow-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-indigo-200 dark:border-indigo-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InsightRow 
              label="Most active subscription type" 
              value={totalActive > totalTrials ? "Paid" : "Trial"} 
              positive={totalActive > totalTrials}
            />
            <InsightRow 
              label="Platform engagement" 
              value={`${avgTasksPerOrg} tasks per organization`} 
              positive={avgTasksPerOrg > 5}
            />
            <InsightRow 
              label="User adoption" 
              value={`${avgUsersPerOrg} users per organization`} 
              positive={avgUsersPerOrg > 3}
            />
            <InsightRow 
              label="Revenue health" 
              value={mrr > 1000 ? "Strong" : mrr > 0 ? "Growing" : "Early stage"} 
              positive={mrr > 0}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, trend, gradient, iconBg, iconColor }: any) {
  return (
    <Card className={`relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br ${gradient} text-white`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
            <div className={iconColor}>{icon}</div>
          </div>
          {trend === "up" && <TrendingUp className="w-5 h-5 opacity-70" />}
          {trend === "down" && <TrendingDown className="w-5 h-5 opacity-70" />}
        </div>
        <CardDescription className="text-white/80 text-xs uppercase tracking-wider mt-3">{label}</CardDescription>
        <CardTitle className="text-4xl font-bold mt-1">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function StatusCard({ label, count, color }: any) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
    gray: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300",
  }
  return (
    <div className={`p-4 rounded-lg border-2 ${colors[color as keyof typeof colors]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-2">{count}</p>
    </div>
  )
}

function InsightRow({ label, value, positive }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-gray-700">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{value}</span>
        {positive ? (
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Activity className="w-3 h-3 text-gray-600 dark:text-gray-400" />
          </div>
        )}
      </div>
    </div>
  )
}
