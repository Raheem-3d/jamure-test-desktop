import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/org'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, TrendingUp, AlertCircle, Clock, Building2, Mail, ArrowRight } from 'lucide-react'

function daysLeft(end: Date) {
  const diff = end.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000*60*60*24)))
}

export default async function TrialsPage() {
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

  const subs = await db.subscription.findMany({
    where: { status: 'TRIAL' },
    include: { organization: { select: { id: true, name: true, primaryEmail: true } } },
    orderBy: { trialEnd: 'asc' }
  })

  const expiringSoon = subs.filter((s: any) => daysLeft(s.trialEnd) <= 7).length
  const totalTrials = subs.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Active Trials
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Organizations currently in trial period
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-4 py-2">
              <Clock className="w-3 h-3 mr-2" />
              {totalTrials} Active
            </Badge>
            {expiringSoon > 0 && (
              <Badge variant="destructive" className="px-4 py-2">
                <AlertCircle className="w-3 h-3 mr-2" />
                {expiringSoon} Expiring Soon
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-100">Total Trials</CardDescription>
              <CardTitle className="text-4xl">{totalTrials}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-100">Expiring Soon (≤7 days)</CardDescription>
              <CardTitle className="text-4xl">{expiringSoon}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-100">Healthy Trials</CardDescription>
              <CardTitle className="text-4xl">{totalTrials - expiringSoon}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Trials Table */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Trial Organizations</CardTitle>
            <CardDescription>Manage trial extensions and conversions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="w-4 h-4" />
                        Organization
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Mail className="w-4 h-4" />
                        Contact
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="w-4 h-4" />
                        Trial Period
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="w-4 h-4" />
                        Days Left
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subs.map((s: any) => {
                    const days = daysLeft(s.trialEnd)
                    const isExpiringSoon = days <= 7
                    const isCritical = days <= 3
                    return (
                      <tr key={s.organizationId} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-gray-800 dark:hover:to-gray-800 transition-all duration-200">
                        <td className="px-6 py-4">
                          <Link href={`/admin/organizations/${s.organizationId}`} className="font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-2 group">
                            {s.organization?.name}
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <a href={`mailto:${s.organization?.primaryEmail}`} className="text-sm text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            {s.organization?.primaryEmail}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Start:</span> {new Date(s.trialStart).toLocaleDateString()}
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">End:</span> {new Date(s.trialEnd).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={isCritical ? "destructive" : isExpiringSoon ? "default" : "secondary"}
                            className={`px-3 py-1 ${
                              isCritical 
                                ? "bg-red-600 hover:bg-red-700" 
                                : isExpiringSoon 
                                  ? "bg-orange-600 hover:bg-orange-700" 
                                  : "bg-green-600 hover:bg-green-700"
                            } text-white`}
                          >
                            {days} {days === 1 ? 'day' : 'days'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <form action={`/api/admin/organizations/${s.organizationId}/extend-trial`} method="post" className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                name="days" 
                                min={1} 
                                max={30} 
                                defaultValue={7} 
                                className="w-16 h-9 text-xs"
                              />
                              <Button size="sm" variant="outline" className="h-9 text-xs">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Extend
                              </Button>
                            </form>
                            <form action={`/api/admin/organizations/${s.organizationId}/convert-trial`} method="post">
                              <Button size="sm" className="h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-xs">
                                Convert
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {subs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No active trials</p>
                        <p className="text-sm text-muted-foreground mt-1">All organizations have converted or expired</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {expiringSoon > 0 && (
          <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                Attention Required
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                {expiringSoon} trial{expiringSoon > 1 ? 's are' : ' is'} expiring within 7 days. Consider reaching out to these organizations.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
