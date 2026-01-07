"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {Building2, Users, CheckCircle2, XCircle, Calendar, Search, Edit, Trash2, Eye,Activity,BarChart3, Settings, Hash, MessageSquare, Loader2} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { UserMultiSelect } from "@/components/user-multi-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function SuperAdminDashboard() {
  const { user, isSuperAdmin } = useAuth()
  // Capture search params once (avoid reordering hooks on re-render)
  const searchParams = useSearchParams()
  const orgParam = searchParams?.get('orgId')
  const tabParam = searchParams?.get('tab')
  const scopedOrgId = orgParam || null
  const scopedTab = tabParam || undefined
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState(scopedTab || "overview")
  // Dialog state
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [editProject, setEditProject] = useState<any | null>(null)
  // Add Project: local state for members and selected org
  const [newProjectMemberIds, setNewProjectMemberIds] = useState<string[]>([])
  const [newProjectOrgId, setNewProjectOrgId] = useState<string | undefined>(undefined)
  const [projectMemberSearch, setProjectMemberSearch] = useState("")
  // Add Task: local state for members and selected org
  const [newTaskMemberIds, setNewTaskMemberIds] = useState<string[]>([])
  const [newTaskOrgId, setNewTaskOrgId] = useState<string | undefined>(undefined)
  const [taskMemberSearch, setTaskMemberSearch] = useState("")
  // Project preview
  const [previewProject, setPreviewProject] = useState<any | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editTask, setEditTask] = useState<any | null>(null)
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [editChannel, setEditChannel] = useState<any | null>(null)

  useEffect(() => {
    if (isSuperAdmin) {
      loadDashboardData()
    }
  }, [isSuperAdmin, scopedOrgId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
  const orgQuery = scopedOrgId ? `?organizationId=${encodeURIComponent(scopedOrgId)}` : ""

  const [statsRes, orgsRes, usersRes, tasksRes, channelsRes, projectsRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        scopedOrgId ? fetch(`/api/superadmin/organizations/${encodeURIComponent(scopedOrgId)}`) : fetch("/api/superadmin/organizations"),
        fetch(`/api/superadmin/users${orgQuery}`),
        fetch(`/api/superadmin/tasks${orgQuery}`),
        fetch(`/api/superadmin/channels${orgQuery}`),
        fetch(`/api/superadmin/projects${orgQuery}`),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (orgsRes.ok) {
        const orgData = await orgsRes.json()
        setOrganizations(Array.isArray(orgData) ? orgData : orgData ? [orgData] : [])
      }
      if (usersRes.ok) setUsers(await usersRes.json())
      if (tasksRes.ok) setTasks(await tasksRes.json())
      if (channelsRes.ok) setChannels(await channelsRes.json())
      if (projectsRes.ok) setProjects(await projectsRes.json())
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Derived, memoized views — must be declared before any early returns
  const filteredOrganizations = useMemo(() => {
    let base = organizations
    if (scopedOrgId) {
      base = base.filter(o => o.id === scopedOrgId)
    }
    return base.filter(
      (org) =>
        org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.primaryEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [organizations, searchTerm, scopedOrgId])
  const [showAddOrg, setShowAddOrg] = useState(false)

  // Scoped resource derivations (client-side filtering + server-side scoped fetch)
  const scopedUsers = useMemo(() => scopedOrgId ? users.filter(u => u.organizationId === scopedOrgId) : users, [users, scopedOrgId])
  const scopedTasks = useMemo(() => scopedOrgId ? tasks.filter(t => (t as any).organization?.id === scopedOrgId || (t as any).organizationId === scopedOrgId) : tasks, [tasks, scopedOrgId])
  const scopedChannels = useMemo(() => scopedOrgId ? channels.filter(c => (c as any).organization?.id === scopedOrgId || (c as any).organizationId === scopedOrgId) : channels, [channels, scopedOrgId])
  const scopedProjects = useMemo(() => scopedOrgId ? projects.filter(p => (p as any).organization?.id === scopedOrgId || (p as any).organizationId === scopedOrgId) : projects, [projects, scopedOrgId])

  const handleDeleteOrganization = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return
    }

    try {
      const res = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Organization deleted successfully",
        })
        loadDashboardData()
      } else {
        throw new Error("Failed to delete organization")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      })
    }
  }

  const handleSuspendOrganization = async (orgId: string, suspend: boolean) => {
    try {
      const res = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: suspend }),
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: `Organization ${suspend ? "suspended" : "activated"} successfully`,
        })
        loadDashboardData()
      } else {
        throw new Error("Failed to update organization")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      })
    }
  }

  const handleEditUser = (userId: string) => {
    const target = users.find(u => u.id === userId)
    setEditUser(target || { id: userId })
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const res = await fetch(`/api/superadmin/users/${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
        loadDashboardData()
      } else {
        throw new Error("Failed to delete user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleViewProject = (projectId: string) => {
    const target = projects.find((p: any) => p.id === projectId)
    setPreviewProject(target || null)
  }

  const handleEditProject = (projectId: string) => {
    const target = projects.find((p: any) => p.id === projectId)
    setEditProject(target || { id: projectId })
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return

    try {
      const res = await fetch(`/api/superadmin/projects/${projectId}`, {
        method: "DELETE",
      })
//  
      if (res.ok) {
        toast({
          title: "Success",
          description: "Project deleted successfully",
        })
        loadDashboardData()
      } else {
        throw new Error("Failed to delete project")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    }
  }

  const handleEditTask = (taskId: string) => {
    const target = tasks.find(t => t.id === taskId)
    setEditTask(target || { id: taskId })
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const res = await fetch(`/api/superadmin/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Task deleted successfully",
        })
        loadDashboardData()
      } else {
        throw new Error("Failed to delete task")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    }
  }

  const handleEditChannel = (channelId: string) => {
    const target = channels.find(c => c.id === channelId)
    setEditChannel(target || { id: channelId })
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return

    try {
      const res = await fetch(`/api/superadmin/channels/${channelId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Channel deleted successfully",
        })
        loadDashboardData()
      } else {
        throw new Error("Failed to delete channel")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      })
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this area.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-10 blur-3xl" />
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {scopedOrgId ? 'Organization Overview' : 'Super Admin Dashboard'}
                    </h1>
                    {scopedOrgId && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Building2 className="h-3 w-3" />
                        Scoped View
                      </span>
                    )}
                  </div>
                </div>
                {scopedOrgId ? (
                  <div className="mt-3 space-y-2 pl-15">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Viewing organization: <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">{scopedOrgId}</code>
                      <Link href="/superadmin" className="ml-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium underline underline-offset-2">
                        Clear scope →
                      </Link>
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Limited actions available in scoped view
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 pl-15">Complete system overview and management</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!scopedOrgId && (
                  <Link href="/admin/organizations">
                    <Button variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-700">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Management
                    </Button>
                  </Link>
                )}
                <Badge variant="destructive" className="px-6 py-3 text-sm font-semibold shadow-lg">
                  <span className="mr-2">⚡</span>
                  SUPER ADMIN
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview (scoped vs global) */}
        {scopedOrgId ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <Users className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-blue-50">Users</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{scopedUsers.length}</div>
                <p className="text-xs text-blue-100 mt-1">In this organization</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <Activity className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-purple-50">Tasks</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{scopedTasks.length}</div>
                <p className="text-xs text-purple-100 mt-1">All tasks & projects</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <Building2 className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-emerald-50">Channels</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{scopedChannels.length}</div>
                <p className="text-xs text-emerald-100 mt-1">Communication spaces</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <CheckCircle2 className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-amber-50">Trial Status</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{organizations[0]?.trialStatus || '—'}</div>
                <p className="text-xs text-amber-100 mt-1">Subscription: {organizations[0]?.subscription?.status || '—'}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <Building2 className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-blue-50">Organizations</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{stats?.organizations?.total || 0}</div>
                <p className="text-xs text-blue-100 mt-1">
                  {stats?.organizations?.active || 0} active, {stats?.organizations?.suspended || 0} suspended
                </p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <Users className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-purple-50">Total Users</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{stats?.users?.total || 0}</div>
                <p className="text-xs text-purple-100 mt-1">Across all organizations</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <CheckCircle2 className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-emerald-50">Active Trials</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{stats?.trials?.active || 0}</div>
                <p className="text-xs text-emerald-100 mt-1">{stats?.trials?.expired || 0} expired</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 h-24 w-24 opacity-20">
                <Activity className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-amber-50">Total Tasks</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{stats?.tasks?.total || 0}</div>
                <p className="text-xs text-amber-100 mt-1">{stats?.channels?.total || 0} channels</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
            {!scopedOrgId && <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Overview</TabsTrigger>}
            <TabsTrigger value="organizations" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">{scopedOrgId ? 'Organization' : 'Organizations'}</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">People</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Projects</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Tasks</TabsTrigger>
            <TabsTrigger value="channels" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Channels</TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Access Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                </div>
                Quick Access
              </CardTitle>
              <CardDescription className="text-blue-50">
                Advanced tools for organization management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/organizations">
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 shadow-lg" size="lg" variant="default">
                  <Building2 className="h-4 w-4 mr-2" />
                  Advanced Organization Management
                </Button>
              </Link>
              <p className="text-xs text-blue-100 mt-3">
                Access detailed organization views, impersonation, trial management, and more.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  Recent Organizations
                </CardTitle>
                <CardDescription>Latest organizations added to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.recent?.organizations?.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={org.trialStatus === "ACTIVE" ? "default" : "secondary"}>
                        {org.trialStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  Recent Users
                </CardTitle>
                <CardDescription>Latest users registered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.recent?.users?.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.organization?.name || "No org"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <div className="flex items-center gap-2">
            {!scopedOrgId && (
              <>
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {isSuperAdmin && (
                  <Button onClick={() => setShowAddOrg(true)}>+ Add Organization</Button>
                )}
                <Link href="/admin/organizations">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced View
                  </Button>
                </Link>
              </>
            )}
            {scopedOrgId && (
              <p className="text-xs text-muted-foreground">Read-only organization summary</p>
            )}
          </div>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.primaryEmail}</TableCell>
                    <TableCell>{org._count?.users || 0}</TableCell>
                    <TableCell>
                      {org.suspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.trialStatus === "ACTIVE" ? "default" : "secondary"}>
                        {org.trialStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!scopedOrgId ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSuspendOrganization(org.id, !org.suspended)
                            }
                          >
                            {org.suspended ? "Activate" : "Suspend"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteOrganization(org.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {/* Add Organization Dialog */}
          <Dialog open={showAddOrg} onOpenChange={(o) => setShowAddOrg(o)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Organization</DialogTitle>
                <DialogDescription>Create a new organization and optionally seed an org admin.</DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget as HTMLFormElement)
                const payload: any = {
                  name: fd.get('name'),
                  primaryEmail: fd.get('primaryEmail'),
                  industry: fd.get('industry') || undefined,
                  phone: fd.get('phone') || undefined,
                  address: fd.get('address') || undefined,
                  adminEmail: fd.get('adminEmail') || undefined,
                  adminName: fd.get('adminName') || undefined,
            
                }
                try {
                  const res = await fetch('/api/superadmin/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if (!res.ok) throw new Error('Create failed')
                  toast({ title: 'Organization created' })
                  setShowAddOrg(false)
                  loadDashboardData()
                } catch {
                  toast({ title: 'Error', description: 'Failed to create organization', variant: 'destructive' })
                }
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Name</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="text-sm">Primary Email</label>
                    <Input name="primaryEmail" type="email" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Industry</label>
                    <Input name="industry" />
                  </div>
                  <div>
                    <label className="text-sm">Phone</label>
                    <Input name="phone" />
                  </div>
                </div>
                <div>
                  <label className="text-sm">Address</label>
                  <Input name="address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Admin Name (optional)</label>
                    <Input name="adminName" />
                  </div>
                  <div>
                    <label className="text-sm">Admin Email (optional)</label>
                    <Input name="adminEmail" type="email" />
                  </div>
                  
                </div>
                <DialogFooter>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                People Management {scopedOrgId && '(Scoped)'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage users across organizations</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-4 py-2 text-sm font-semibold">
                Total: {scopedUsers.length} users
              </Badge>
              {!scopedOrgId && (
                <Button size="lg" onClick={() => setShowAddUser(true)} className="shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Users className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          </div>
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Tasks Created</TableHead>
                  <TableHead>Tasks Assigned</TableHead>
                  <TableHead>Messages Sent</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.organization?.name || "N/A"}</span>
                        <span className="text-xs text-muted-foreground">{user.organizationId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isSuperAdmin ? "destructive" : "default"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user._count?.createdTasks || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user._count?.assignedTasks || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user._count?.sentMessages || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {/* Super admin only for global actions; scoped view is read-only already */}
                      {(!scopedOrgId && isSuperAdmin) ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditUser(user.id)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {/* Add User Dialog */}
          <Dialog open={showAddUser} onOpenChange={(o) => setShowAddUser(o)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>Create a new user. A default password will be set.</DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget as HTMLFormElement)
                const payload: any = {
                  name: fd.get('name') || undefined,
                  email: fd.get('email'),
                  role: fd.get('role') || 'EMPLOYEE',
                  organizationId: fd.get('organizationId') || undefined,
                  isSuperAdmin: fd.get('role') === 'SUPER_ADMIN'
                }
                try {
                  const res = await fetch('/api/superadmin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if (!res.ok) throw new Error('Create failed')
                  toast({ title: 'User created' })
                  setShowAddUser(false)
                  loadDashboardData()
                } catch (err) {
                  toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' })
                }
              }}>
                <div>
                  <label className="text-sm">Name</label>
                  <Input name="name" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="text-sm">Email</label>
                  <Input name="email" type="email" required placeholder="jane@example.com" />
                </div>
                <div>
                  <label className="text-sm">Role</label>
                  <Select onValueChange={(v) => { const i = document.querySelector('#addUserRole') as HTMLInputElement | null; if (i) i.value = v }}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                      <SelectItem value="MANAGER">MANAGER</SelectItem>
                      <SelectItem value="ORG_ADMIN">ORG_ADMIN</SelectItem>
                      <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                  <input id="addUserRole" type="hidden" name="role" defaultValue="EMPLOYEE" />
                </div>
                <div>
                  <label className="text-sm">Organization</label>
                  <Select onValueChange={(v) => { const i = document.querySelector('#addUserOrg') as HTMLInputElement | null; if (i) i.value = v }}>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>
                      {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <input id="addUserOrg" type="hidden" name="organizationId" />
                </div>
                <DialogFooter>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {/* Edit User Dialog */}
          <Dialog open={!!editUser} onOpenChange={(o) => setEditUser(o ? editUser : null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {editUser && (
                <form className="space-y-3" onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget as HTMLFormElement)
                  const payload: any = {
                    name: fd.get('name') || undefined,
                    role: fd.get('role') || undefined,
                    organizationId: fd.get('organizationId') || undefined,
                    isSuperAdmin: fd.get('role') === 'SUPER_ADMIN'
                  }
                  try {
                    const res = await fetch(`/api/superadmin/users/${editUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    if (!res.ok) throw new Error('Update failed')
                    toast({ title: 'User updated' })
                    setEditUser(null)
                    loadDashboardData()
                  } catch {
                    toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' })
                  }
                }}>
                  <div>
                    <label className="text-sm">Name</label>
                    <Input name="name" defaultValue={editUser.name || ''} />
                  </div>
                  <div>
                    <label className="text-sm">Role</label>
                    <Select defaultValue={editUser.role} onValueChange={(v) => { const i = document.querySelector('#editUserRole') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                        <SelectItem value="MANAGER">MANAGER</SelectItem>
                        <SelectItem value="ORG_ADMIN">ORG_ADMIN</SelectItem>
                        <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="editUserRole" type="hidden" name="role" defaultValue={editUser.role} />
                  </div>
                  <div>
                    <label className="text-sm">Organization</label>
                    <Select defaultValue={editUser.organizationId} onValueChange={(v) => { const i = document.querySelector('#editUserOrg') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input id="editUserOrg" type="hidden" name="organizationId" defaultValue={editUser.organizationId || ''} />
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Projects Overview {scopedOrgId && '(Scoped)'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage all projects across the platform</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-2">Total: {scopedProjects.length}</Badge>
              <Badge className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600">
                Running: {scopedProjects.filter((p: any) => p.status === "IN_PROGRESS").length}
              </Badge>
              {!scopedOrgId && (
                <Button size="lg" onClick={() => setShowAddProject(true)} className="shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              )}
            </div>
          </div>
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Title</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Assigned Members</TableHead>
                  <TableHead>Stages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex flex-col">
                        <span className="truncate">{project.title}</span>
                        {project.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {project.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.organization?.name || "N/A"}</span>
                        <span className="text-xs text-muted-foreground">{project.organization?.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{project.creator?.name}</span>
                        <span className="text-xs text-muted-foreground">{project.creator?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary">{project.assignments?.length || 0} members</Badge>
                        {project.assignments?.slice(0, 2).map((assignment: any) => (
                          <span key={assignment.user.id} className="text-xs text-muted-foreground">
                            {assignment.user.name}
                          </span>
                        ))}
                        {(project.assignments?.length || 0) > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{(project.assignments?.length || 0) - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.Stage?.length || 0} stages</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === "IN_PROGRESS"
                            ? "default"
                            : project.status === "DONE"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.priority === "URGENT" ? "destructive" : "default"}>
                        {project.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {((project as any).deadlineStart && (project as any).deadlineEnd)
                        ? (((project as any).deadlineStart !== (project as any).deadlineEnd)
                            ? `${new Date((project as any).deadlineStart).toLocaleDateString()} — ${new Date((project as any).deadlineEnd).toLocaleDateString()}`
                            : new Date((project as any).deadlineEnd).toLocaleDateString())
                        : (project.deadline
                            ? new Date(project.deadline).toLocaleDateString()
                            : "No deadline")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {(!scopedOrgId && isSuperAdmin) ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewProject(project.id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditProject(project.id)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {/* Project Preview Dialog */}
          <Dialog open={!!previewProject} onOpenChange={(o) => setPreviewProject(o ? previewProject : null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Project Preview</DialogTitle>
                <DialogDescription>Quick view of project details</DialogDescription>
              </DialogHeader>
              {previewProject && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{previewProject.title}</h3>
                    {previewProject.description && (
                      <p className="text-sm text-muted-foreground mt-1">{previewProject.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Organization:</span>{' '}
                      <span>{previewProject.organization?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Creator:</span>{' '}
                      <span>{previewProject.creator?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{' '}
                      <Badge variant={previewProject.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>{previewProject.status}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>{' '}
                      <Badge variant={previewProject.priority === 'URGENT' ? 'destructive' : 'outline'}>{previewProject.priority}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deadline:</span>{' '}
                      <span>
                        {((previewProject as any).deadlineStart && (previewProject as any).deadlineEnd)
                          ? (((previewProject as any).deadlineStart !== (previewProject as any).deadlineEnd)
                              ? `${new Date((previewProject as any).deadlineStart).toLocaleDateString()} — ${new Date((previewProject as any).deadlineEnd).toLocaleDateString()}`
                              : new Date((previewProject as any).deadlineEnd).toLocaleDateString())
                          : (previewProject.deadline
                              ? new Date(previewProject.deadline).toLocaleDateString()
                              : 'No deadline')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>{' '}
                      <span>{new Date(previewProject.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Assigned Members ({previewProject.assignments?.length || 0})</h4>
                    {previewProject.assignments?.length ? (
                      <div className="flex -space-x-2">
                        {previewProject.assignments.slice(0, 8).map((a: any) => (
                          <Avatar key={a.id} className="h-7 w-7 border-2 border-background">
                            <AvatarImage src={a.user?.image || ''} />
                            <AvatarFallback className="text-xs">{a.user?.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No members assigned</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Stages ({previewProject.Stage?.length || 0})</h4>
                    {previewProject.Stage?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {previewProject.Stage.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((s: any) => (
                          <Badge key={s.id} variant="outline">{s.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No stages</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPreviewProject(null)}>Close</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
          {/* Add Project Dialog  me project add karta hu to member bhi add karne ka option do.*/}
          <Dialog open={showAddProject} onOpenChange={(o) => setShowAddProject(o)}>
            <DialogContent onInteractOutside={(e) => {
              const target = e.target as HTMLElement
              if (target.closest('[data-user-multi-select]')) {
                e.preventDefault()
              }
            }}>
              <DialogHeader>
                <DialogTitle>Add Project</DialogTitle>
                <DialogDescription>Create a task-with-stages project.</DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget as HTMLFormElement)
                const stagesRaw = String(fd.get('stages') || '').split(',').map(s => s.trim()).filter(Boolean)
                const payload: any = {
                  title: fd.get('title'),
                  description: fd.get('description') || undefined,
                  priority: fd.get('priority') || 'MEDIUM',
                  status: fd.get('status') || 'IN_PROGRESS',
                  deadline: fd.get('deadline') || undefined,
                  organizationId: newProjectOrgId || fd.get('organizationId') || undefined,
                  assignedUserIds: newProjectMemberIds,
                  stages: stagesRaw.map((name: string, idx: number) => ({ name, order: idx }))
                }
                try {
                  const res = await fetch('/api/superadmin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if (!res.ok) throw new Error('Create failed')
                  toast({ title: 'Project created' })
                  setShowAddProject(false)
                  setNewProjectMemberIds([])
                  setNewProjectOrgId(undefined)
                  loadDashboardData()
                } catch {
                  toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' })
                }
              }}>
                <div>
                  <label className="text-sm">Title</label>
                  <Input name="title" required />
                </div>
                <div>
                  <label className="text-sm">Description</label>
                  <Input name="description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Priority</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#projPriority') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">LOW</SelectItem>
                        <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                        <SelectItem value="HIGH">HIGH</SelectItem>
                        <SelectItem value="URGENT">URGENT</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="projPriority" name="priority" type="hidden" defaultValue="MEDIUM" />
                  </div>
                  <div>
                    <label className="text-sm">Status</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#projStatus') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">TODO</SelectItem>
                        <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                        <SelectItem value="DONE">DONE</SelectItem>
                        <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="projStatus" name="status" type="hidden" defaultValue="IN_PROGRESS" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Organization</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#projOrg') as HTMLInputElement | null; if (i) i.value = v; setNewProjectOrgId(v); setNewProjectMemberIds([]); setProjectMemberSearch('') }}>
                      <SelectTrigger><SelectValue placeholder="Organization" /></SelectTrigger>
                      <SelectContent>
                        {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input id="projOrg" name="organizationId" type="hidden" />
                  </div>
                  <div>
                    <label className="text-sm">Deadline</label>
                    <Input type="date" name="deadline" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm flex justify-between items-center">
                    <span>Members</span>
                    {newProjectMemberIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">{newProjectMemberIds.length} selected</span>
                    )}
                  </Label>
                  {newProjectOrgId ? (
                    <div className="space-y-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search members..."
                          value={projectMemberSearch}
                          onChange={(e) => setProjectMemberSearch(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      {/* Members List */}
                      {(() => {
                        const orgUsers = scopedOrgId ? scopedUsers : users.filter(u => u.organizationId === newProjectOrgId)
                        const searchQuery = projectMemberSearch.toLowerCase()
                        const filteredMembers = orgUsers.filter(u => 
                          !searchQuery || 
                          u.name?.toLowerCase().includes(searchQuery) || 
                          u.email?.toLowerCase().includes(searchQuery)
                        )
                        return (
                          <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50">
                            {filteredMembers.length === 0 ? (
                              <div className="text-center py-3 text-gray-500 text-sm">
                                {projectMemberSearch ? "No members found" : "No members available"}
                              </div>
                            ) : (
                              filteredMembers.map((u) => (
                                <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                  <Checkbox
                                    id={`proj-user-${u.id}`}
                                    checked={newProjectMemberIds.includes(u.id)}
                                    onCheckedChange={() => {
                                      setNewProjectMemberIds(prev =>
                                        prev.includes(u.id)
                                          ? prev.filter(id => id !== u.id)
                                          : [...prev, u.id]
                                      )
                                    }}
                                  />
                                  <Label
                                    htmlFor={`proj-user-${u.id}`}
                                    className="text-sm font-medium cursor-pointer flex-1"
                                  >
                                    <div>{u.name}</div>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-2">Select an organization to choose members.</div>
                  )}
                </div>
                <div>
                  <label className="text-sm">Stages (comma separated)</label>
                  <Input name="stages" placeholder="Backlog, In Progress, Review, Done" />
                </div>
                <DialogFooter>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {/* Edit Project Dialog */}
          <Dialog open={!!editProject} onOpenChange={(o) => setEditProject(o ? editProject : null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              {editProject && (
                <form className="space-y-3" onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget as HTMLFormElement)
                  const payload: any = {
                    title: fd.get('title') || undefined,
                    description: fd.get('description') || undefined,
                    priority: fd.get('priority') || undefined,
                    status: fd.get('status') || undefined,
                    deadline: fd.get('deadline') || undefined
                  }
                  try {
                    const res = await fetch(`/api/superadmin/tasks/${editProject.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    if (!res.ok) throw new Error('Update failed')
                    toast({ title: 'Project updated' })
                    setEditProject(null)
                    loadDashboardData()
                  } catch {
                    toast({ title: 'Error', description: 'Failed to update project', variant: 'destructive' })
                  }
                }}>
                  <div>
                    <label className="text-sm">Title</label>
                    <Input name="title" defaultValue={editProject.title || ''} />
                  </div>
                  <div>
                    <label className="text-sm">Description</label>
                    <Input name="description" defaultValue={editProject.description || ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Priority</label>
                      <Select defaultValue={editProject.priority} onValueChange={(v) => { const i = document.querySelector('#editProjPriority') as HTMLInputElement | null; if (i) i.value = v }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">LOW</SelectItem>
                          <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                          <SelectItem value="URGENT">URGENT</SelectItem>
                        </SelectContent>
                      </Select>
                      <input id="editProjPriority" name="priority" type="hidden" defaultValue={editProject.priority || 'MEDIUM'} />
                    </div>
                    <div>
                      <label className="text-sm">Status</label>
                      <Select defaultValue={editProject.status} onValueChange={(v) => { const i = document.querySelector('#editProjStatus') as HTMLInputElement | null; if (i) i.value = v }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">TODO</SelectItem>
                          <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                          <SelectItem value="DONE">DONE</SelectItem>
                          <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                        </SelectContent>
                      </Select>
                      <input id="editProjStatus" name="status" type="hidden" defaultValue={editProject.status || 'IN_PROGRESS'} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm">Deadline</label>
                    <Input type="date" name="deadline" defaultValue={editProject.deadline ? String(new Date(editProject.deadline)).slice(0,10) : ''} />
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Tasks Management {scopedOrgId && '(Scoped)'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Track and manage all tasks</p>
            </div>
            {!scopedOrgId && (
              <Button size="lg" onClick={() => setShowAddTask(true)} className="shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Activity className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate" title={task.title}>
                        {task.title}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="truncate text-sm text-muted-foreground" title={task.description || ""}>
                        {task.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>{task.organization?.name || "N/A"}</TableCell>
                    <TableCell>
                      {(task as any).project?.title || "No project"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.creator?.image || ""} />
                          <AvatarFallback>{task.creator?.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.creator?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignments && task.assignments.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-2">
                            {task.assignments.slice(0, 3).map((assignment: any) => (
                              <Avatar key={assignment.id} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={assignment.user?.image || ""} />
                                <AvatarFallback className="text-xs">
                                  {assignment.user?.name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {task.assignments.length > 3 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{task.assignments.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.status === "IN_PROGRESS" ? "default" : "secondary"}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.priority === "URGENT" ? "destructive" : task.priority === "HIGH" ? "default" : "secondary"}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString()
                        : "No deadline"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {(!scopedOrgId && isSuperAdmin) ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTask(task.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {/* Add Task Dialog */}
          <Dialog open={showAddTask} onOpenChange={(o) => setShowAddTask(o)}>
            <DialogContent onInteractOutside={(e) => {
              const target = e.target as HTMLElement
              if (target.closest('[data-user-multi-select]')) {
                e.preventDefault()
              }
            }}>
              <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget as HTMLFormElement)
                const payload: any = {
                  title: fd.get('title'),
                  description: fd.get('description') || undefined,
                  priority: fd.get('priority') || 'MEDIUM',
                  status: fd.get('status') || 'TODO',
                  deadline: fd.get('deadline') || undefined,
                  organizationId: newTaskOrgId || fd.get('organizationId') || undefined,
                  assignedUserIds: newTaskMemberIds
                }
                try {
                  const res = await fetch('/api/superadmin/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if (!res.ok) throw new Error('Create failed')
                  toast({ title: 'Task created' })
                  setShowAddTask(false)
                  setNewTaskMemberIds([])
                  setNewTaskOrgId(undefined)
                  loadDashboardData()
                } catch {
                  toast({ title: 'Error', description: 'Failed to create task', variant: 'destructive' })
                }
              }}>
                <div><label className="text-sm">Title</label><Input name="title" required /></div>
                <div><label className="text-sm">Description</label><Input name="description" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Priority</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#taskPriority') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">LOW</SelectItem>
                        <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                        <SelectItem value="HIGH">HIGH</SelectItem>
                        <SelectItem value="URGENT">URGENT</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="taskPriority" name="priority" type="hidden" defaultValue="MEDIUM" />
                  </div>
                  <div>
                    <label className="text-sm">Status</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#taskStatus') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">TODO</SelectItem>
                        <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                        <SelectItem value="DONE">DONE</SelectItem>
                        <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="taskStatus" name="status" type="hidden" defaultValue="TODO" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Organization</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#taskOrg') as HTMLInputElement | null; if (i) i.value = v; setNewTaskOrgId(v); setNewTaskMemberIds([]); setTaskMemberSearch('') }}>
                      <SelectTrigger><SelectValue placeholder="Organization" /></SelectTrigger>
                      <SelectContent>
                        {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input id="taskOrg" name="organizationId" type="hidden" />
                  </div>
                  <div>
                    <label className="text-sm">Deadline</label>
                    <Input type="date" name="deadline" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm flex justify-between items-center">
                    <span>Members</span>
                    {newTaskMemberIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">{newTaskMemberIds.length} selected</span>
                    )}
                  </Label>
                  {newTaskOrgId ? (
                    <div className="space-y-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search members..."
                          value={taskMemberSearch}
                          onChange={(e) => setTaskMemberSearch(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      {/* Members List */}
                      {(() => {
                        const orgUsers = scopedOrgId ? scopedUsers : users.filter(u => u.organizationId === newTaskOrgId)
                        const searchQuery = taskMemberSearch.toLowerCase()
                        const filteredMembers = orgUsers.filter(u => 
                          !searchQuery || 
                          u.name?.toLowerCase().includes(searchQuery) || 
                          u.email?.toLowerCase().includes(searchQuery)
                        )
                        return (
                          <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50">
                            {filteredMembers.length === 0 ? (
                              <div className="text-center py-3 text-gray-500 text-sm">
                                {taskMemberSearch ? "No members found" : "No members available"}
                              </div>
                            ) : (
                              filteredMembers.map((u) => (
                                <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                  <Checkbox
                                    id={`task-user-${u.id}`}
                                    checked={newTaskMemberIds.includes(u.id)}
                                    onCheckedChange={() => {
                                      setNewTaskMemberIds(prev =>
                                        prev.includes(u.id)
                                          ? prev.filter(id => id !== u.id)
                                          : [...prev, u.id]
                                      )
                                    }}
                                  />
                                  <Label
                                    htmlFor={`task-user-${u.id}`}
                                    className="text-sm font-medium cursor-pointer flex-1"
                                  >
                                    <div>{u.name}</div>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-2">Select an organization to choose members.</div>
                  )}
                </div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {/* Edit Task Dialog */}
          <Dialog open={!!editTask} onOpenChange={(o) => setEditTask(o ? editTask : null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
              {editTask && (
                <form className="space-y-3" onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget as HTMLFormElement)
                  const payload: any = {
                    title: fd.get('title') || undefined,
                    description: fd.get('description') || undefined,
                    priority: fd.get('priority') || undefined,
                    status: fd.get('status') || undefined,
                    deadline: fd.get('deadline') || undefined
                  }
                  try {
                    const res = await fetch(`/api/superadmin/tasks/${editTask.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    if (!res.ok) throw new Error('Update failed')
                    toast({ title: 'Task updated' })
                    setEditTask(null)
                    loadDashboardData()
                  } catch {
                    toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' })
                  }
                }}>
                  <div><label className="text-sm">Title</label><Input name="title" defaultValue={editTask.title || ''} /></div>
                  <div><label className="text-sm">Description</label><Input name="description" defaultValue={editTask.description || ''} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Priority</label>
                      <Select defaultValue={editTask.priority} onValueChange={(v) => { const i = document.querySelector('#editTaskPriority') as HTMLInputElement | null; if (i) i.value = v }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">LOW</SelectItem>
                          <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                          <SelectItem value="URGENT">URGENT</SelectItem>
                        </SelectContent>
                      </Select>
                      <input id="editTaskPriority" name="priority" type="hidden" defaultValue={editTask.priority || 'MEDIUM'} />
                    </div>
                    <div>
                      <label className="text-sm">Status</label>
                      <Select defaultValue={editTask.status} onValueChange={(v) => { const i = document.querySelector('#editTaskStatus') as HTMLInputElement | null; if (i) i.value = v }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">TODO</SelectItem>
                          <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                          <SelectItem value="DONE">DONE</SelectItem>
                          <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                        </SelectContent>
                      </Select>
                      <input id="editTaskStatus" name="status" type="hidden" defaultValue={editTask.status || 'TODO'} />
                    </div>
                  </div>
                  <div><label className="text-sm">Deadline</label><Input type="date" name="deadline" defaultValue={editTask.deadline ? String(new Date(editTask.deadline)).slice(0,10) : ''} /></div>
                  <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Channels Management {scopedOrgId && '(Scoped)'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage communication channels</p>
            </div>
            {!scopedOrgId && (
              <Button size="lg" onClick={() => setShowAddChannel(true)} className="shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Hash className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            )}
          </div>
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedChannels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {channel.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="truncate text-sm text-muted-foreground" title={channel.description || ""}>
                        {channel.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>{channel.organization?.name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={channel.creator?.image || ""} />
                          <AvatarFallback>{channel.creator?.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{channel.creator?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={channel.isPrivate ? "secondary" : "default"}>
                        {channel.isPrivate ? "Private" : "Public"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{channel.members?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{channel._count?.messages || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(channel.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {(!scopedOrgId && isSuperAdmin) ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditChannel(channel.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteChannel(channel.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {/* Add Channel Dialog */}
          <Dialog open={showAddChannel} onOpenChange={(o) => setShowAddChannel(o)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Channel</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget as HTMLFormElement)
                const isPrivate = fd.get('privacy') === 'private'
                const payload: any = {
                  name: fd.get('name'),
                  description: fd.get('description') || undefined,
                  isPrivate,
                  organizationId: fd.get('organizationId') || undefined
                }
                try {
                  const res = await fetch('/api/superadmin/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if (!res.ok) throw new Error('Create failed')
                  toast({ title: 'Channel created' })
                  setShowAddChannel(false)
                  loadDashboardData()
                } catch {
                  toast({ title: 'Error', description: 'Failed to create channel', variant: 'destructive' })
                }
              }}>
                <div><label className="text-sm">Name</label><Input name="name" required /></div>
                <div><label className="text-sm">Description</label><Input name="description" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Privacy</label>
                    <Select defaultValue="public" onValueChange={(v) => { const i = document.querySelector('#chanPrivacy') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="chanPrivacy" name="privacy" type="hidden" defaultValue="public" />
                  </div>
                  <div>
                    <label className="text-sm">Organization</label>
                    <Select onValueChange={(v) => { const i = document.querySelector('#chanOrg') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input id="chanOrg" name="organizationId" type="hidden" />
                  </div>
                </div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {/* Edit Channel Dialog */}
          <Dialog open={!!editChannel} onOpenChange={(o) => setEditChannel(o ? editChannel : null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Channel</DialogTitle></DialogHeader>
              {editChannel && (
                <form className="space-y-3" onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget as HTMLFormElement)
                  const isPrivate = fd.get('privacy') === 'private'
                  const payload: any = {
                    name: fd.get('name') || undefined,
                    description: fd.get('description') || undefined,
                    isPrivate
                  }
                  try {
                    const res = await fetch(`/api/superadmin/channels/${editChannel.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    if (!res.ok) throw new Error('Update failed')
                    toast({ title: 'Channel updated' })
                    setEditChannel(null)
                    loadDashboardData()
                  } catch {
                    toast({ title: 'Error', description: 'Failed to update channel', variant: 'destructive' })
                  }
                }}>
                  <div><label className="text-sm">Name</label><Input name="name" defaultValue={editChannel.name || ''} /></div>
                  <div><label className="text-sm">Description</label><Input name="description" defaultValue={editChannel.description || ''} /></div>
                  <div>
                    <label className="text-sm">Privacy</label>
                    <Select defaultValue={editChannel.isPrivate ? 'private' : 'public'} onValueChange={(v) => { const i = document.querySelector('#editChanPrivacy') as HTMLInputElement | null; if (i) i.value = v }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <input id="editChanPrivacy" name="privacy" type="hidden" defaultValue={editChannel.isPrivate ? 'private' : 'public'} />
                  </div>
                  <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
