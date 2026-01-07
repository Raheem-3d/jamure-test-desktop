import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/org'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, User, Building2, Clock, Search, AlertCircle } from 'lucide-react'

export default async function AuditLogsPage({ searchParams }: { searchParams?: { org?: string; action?: string } }) {
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

  const orgFilter = searchParams?.org
  const actionFilter = searchParams?.action
  const whereClause: any = {}
  if (orgFilter) whereClause.organizationId = orgFilter
  if (actionFilter) whereClause.action = { contains: actionFilter, mode: 'insensitive' }

  const logs = await db.activityLog.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      organization: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  const totalLogs = await db.activityLog.count({ where: whereClause })
  const uniqueActions = await db.activityLog.groupBy({ by: ['action'], _count: true, orderBy: { _count: { action: 'desc' } }, take: 5 })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Audit Logs
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Track all administrative actions and system events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-4 py-2">
              <Clock className="w-3 h-3 mr-2" />
              {totalLogs} Total Logs
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100">Total Events</CardDescription>
              <CardTitle className="text-3xl">{totalLogs}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-100">Recent (100)</CardDescription>
              <CardTitle className="text-3xl">{logs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-100">Action Types</CardDescription>
              <CardTitle className="text-3xl">{uniqueActions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-100">Filtered</CardDescription>
              <CardTitle className="text-3xl">{orgFilter || actionFilter ? logs.length : '—'}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filters
            </CardTitle>
            <CardDescription>Search and filter activity logs</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input 
                  name="org" 
                  placeholder="Filter by organization ID..." 
                  defaultValue={orgFilter} 
                  className="h-11"
                />
              </div>
              <div className="flex-1">
                <Input 
                  name="action" 
                  placeholder="Filter by action keyword..." 
                  defaultValue={actionFilter} 
                  className="h-11"
                />
              </div>
              <Button type="submit" className="h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Search className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Latest {logs.length} administrative actions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {logs.map((l: any, idx: number) => (
                  <div 
                    key={l.id} 
                    className="p-5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-800 transition-all duration-200 border-l-4 border-transparent hover:border-blue-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="default" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                {l.action}
                              </Badge>
                              {l.impersonation && (
                                <Badge variant="destructive">Impersonation</Badge>
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              {l.user && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="w-4 h-4" />
                                  <span className="font-medium">{l.user.name || l.user.email}</span>
                                </div>
                              )}
                              {l.organization && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Building2 className="w-4 h-4" />
                                  <span className="font-medium">{l.organization.name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(l.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            {l.reason && (
                              <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-blue-200 pl-3">
                                {l.reason}
                              </p>
                            )}
                            {l.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer hover:underline">View Details</summary>
                                <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-auto">
                                  {JSON.stringify(l.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No logs found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Actions */}
        {uniqueActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Actions</CardTitle>
              <CardDescription>Most frequent administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uniqueActions.map((a: any) => (
                  <div key={a.action} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <span className="font-medium">{a.action}</span>
                    <Badge variant="secondary">{a._count} times</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
