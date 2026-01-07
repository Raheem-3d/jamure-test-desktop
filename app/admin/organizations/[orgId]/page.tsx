import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/org"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from 'next/link'
import ActivityLogViewer from "@/components/activity-log-viewer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Building2, Users, FolderKanban, ListTodo, Hash, 
  AlertCircle, Settings, Trash2, Save, ArrowLeft, 
  LayoutDashboard, Megaphone, Clock, Mail, Phone,
  MapPin, Ban, CheckCircle, UserMinus, AlertTriangle
} from "lucide-react"
import { emitToUser } from "@/lib/socket-server"

export default async function AdminOrgDetailPage({ params }: { params: { orgId: string } }) {
  const session = (await getServerSession(authOptions as any)) as any
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
  const orgId = params.orgId
  const organization = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: true,
      users: { select: { id: true, name: true, email: true, role: true } },
    },
  })
  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <CardTitle className="text-2xl">Organization Not Found</CardTitle>
            <CardDescription>The requested organization does not exist.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/admin/organizations">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Related resources (people/projects/tasks/channels) for integration
  const tasks = await db.task.findMany({
    where: { organizationId: orgId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      Stage: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })
  const projects = tasks.filter((t: any) => t.Stage && t.Stage.length > 0)
  const channels = await db.channel.findMany({
    where: { organizationId: orgId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })

  async function forceExpire() {
    'use server'
    if (!organization.subscription) return
    await db.subscription.update({ where: { organizationId: organization.id }, data: { status: 'EXPIRED' } })
  }

  async function broadcastAnnouncement(formData: FormData) {
    'use server'
    const title = formData.get('title') as string
    const message = formData.get('message') as string
    const orgId = formData.get('orgId') as string
    if (!title || !message || !orgId) return
    // Ensure org still exists (avoid stale closure)
    const orgCheck = await db.organization.findUnique({ where: { id: orgId }, select: { id: true } })
    if (!orgCheck) return
    const announcement = await db.announcement.create({ data: { title, message, scope: 'ORG', organizationId: orgId } })
    // Create per-user notifications (ANNOUNCEMENT)
    try {
      // Recipient expansion: include ORG_ADMIN + MANAGER if admins exist; fallback to MANAGER only if none.
      const admins = await db.user.findMany({ where: { organizationId: orgId, role: 'ORG_ADMIN' }, select: { id: true } })
      const managers = await db.user.findMany({ where: { organizationId: orgId, role: 'MANAGER' }, select: { id: true } })
      const recipients = admins.length > 0 ? [...admins, ...managers] : managers
      const uniqueRecipientIds = Array.from(new Set(recipients.map(r => r.id)))
      await Promise.all(
        uniqueRecipientIds.map(async (userId: string) => {
          const notification = await db.notification.create({
            data: {
              type: 'ANNOUNCEMENT',
              content: `${title}: ${message.slice(0, 180)}`,
              userId,
              announcementId: announcement.id,
              organizationId: orgId,
            },
          })
          try { emitToUser(userId, 'new-notification', notification) } catch {}
        })
      )
    } catch (e) {
      console.error('Failed to create announcement notifications', e)
    }
  }
  
  // Edit organization server action
  async function updateOrganization(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const primaryEmail = formData.get('primaryEmail') as string
    const industry = formData.get('industry') as string | null
    const phone = formData.get('phone') as string | null
    const address = formData.get('address') as string | null
    const suspended = formData.get('suspended') === 'on'
    if (!name || !primaryEmail) return
    await db.organization.update({
      where: { id: organization.id },
      data: { name, primaryEmail, industry: industry || undefined, phone: phone || undefined, address: address || undefined, suspended },
    })
    redirect(`/admin/organizations/${organization.id}`)
  }

  // Delete organization server action
  async function deleteOrganization() {
    'use server'
    await db.organization.delete({ where: { id: organization.id } })
    redirect('/admin/organizations')
  }

  async function deleteUser(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    if (!userId) return
    await db.user.delete({ where: { id: userId } })
    redirect(`/admin/organizations/${organization.id}`)
  }
  async function deleteTask(formData: FormData) {
    'use server'
    const taskId = formData.get('taskId') as string
    if (!taskId) return
    await db.task.delete({ where: { id: taskId } })
    redirect(`/admin/organizations/${organization.id}`)
  }
  async function deleteChannel(formData: FormData) {
    'use server'
    const channelId = formData.get('channelId') as string
    if (!channelId) return
    await db.channel.delete({ where: { id: channelId } })
    redirect(`/admin/organizations/${organization.id}`)
  }
//1- Organizations id k page per Admin Dashboard k link per jane k baad srif usi Organizations ki details open ho.
//2- ,Organizations ko edit ,delete ka option do.
//3- People,Projects,Tasks,Channels ko Add ,edit ,delete ka code likah hau hai.us add kro taki tum ko new code lihka na pade.
//4-,

  const statusColor = organization.subscription?.status === 'ACTIVE' 
    ? 'bg-green-500' 
    : organization.subscription?.status === 'TRIAL' 
      ? 'bg-blue-500' 
      : 'bg-red-500'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {organization.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`${statusColor} text-white border-0`}>
                    {organization.subscription?.status || 'No Subscription'}
                  </Badge>
                  {organization.suspended && (
                    <Badge variant="destructive">
                      <Ban className="w-3 h-3 mr-1" />
                      Suspended
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/organizations">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Link href={`/superadmin?orgId=${organization.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin Dashboard
              </Button>
            </Link>
            <form action={`/api/admin/organizations/${organization.id}/impersonate`} method="post">
              <Button type="submit" size="sm" variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Impersonate
              </Button>
            </form>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 opacity-80" />
              </div>
              <CardDescription className="text-blue-100">Users</CardDescription>
              <CardTitle className="text-3xl">{organization.users.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <FolderKanban className="w-8 h-8 opacity-80" />
              </div>
              <CardDescription className="text-purple-100">Projects</CardDescription>
              <CardTitle className="text-3xl">{projects.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <ListTodo className="w-8 h-8 opacity-80" />
              </div>
              <CardDescription className="text-green-100">Tasks</CardDescription>
              <CardTitle className="text-3xl">{tasks.filter((t: any) => !(t.Stage && t.Stage.length > 0)).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Hash className="w-8 h-8 opacity-80" />
              </div>
              <CardDescription className="text-orange-100">Channels</CardDescription>
              <CardTitle className="text-3xl">{channels.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="overview">
              <Settings className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="channels">
              <Hash className="w-4 h-4 mr-2" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Megaphone className="w-4 h-4 mr-2" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Organization Settings
                </CardTitle>
                <CardDescription>Edit organization details and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateOrganization} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Organization Name
                      </Label>
                      <Input id="name" name="name" defaultValue={organization.name} className="h-11" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryEmail" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Primary Email
                      </Label>
                      <Input id="primaryEmail" name="primaryEmail" type="email" defaultValue={organization.primaryEmail} className="h-11" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Industry
                      </Label>
                      <Input id="industry" name="industry" defaultValue={organization.industry || ''} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </Label>
                      <Input id="phone" name="phone" defaultValue={organization.phone || ''} className="h-11" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address
                      </Label>
                      <Textarea id="address" name="address" defaultValue={organization.address || ''} rows={3} />
                    </div>
                    <div className="flex items-center space-x-2 md:col-span-2">
                      <input 
                        type="checkbox" 
                        name="suspended" 
                        defaultChecked={organization.suspended} 
                        id="suspended"
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="suspended" className="flex items-center gap-2 cursor-pointer">
                        <Ban className="w-4 h-4 text-red-600" />
                        Suspended (blocks access)
                      </Label>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-3">
                    <Button type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-400">
                  Irreversible actions - proceed with caution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800">
                  <div>
                    <p className="font-medium">Force Expire Trial</p>
                    <p className="text-sm text-muted-foreground">Immediately end the trial period</p>
                  </div>
                  <form action={forceExpire}>
                    <Button type="submit" variant="destructive" size="sm">
                      <Clock className="w-4 h-4 mr-2" />
                      Expire Now
                    </Button>
                  </form>
                </div>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800">
                  <div>
                    <p className="font-medium">Delete Organization</p>
                    <p className="text-sm text-muted-foreground">Permanently remove all data</p>
                  </div>
                  <form action={deleteOrganization}>
                    <Button type="submit" variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Organization Users ({organization.users.length})
                </CardTitle>
                <CardDescription>Manage users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {organization.users.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name || u.email}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{u.role}</Badge>
                          <form action={deleteUser}>
                            <input type="hidden" name="userId" value={u.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                    {organization.users.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-muted-foreground">No users found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderKanban className="w-5 h-5" />
                      Projects ({projects.length})
                    </CardTitle>
                    <CardDescription>Projects with multiple stages</CardDescription>
                  </div>
                  <Link href={`/superadmin?orgId=${organization.id}&tab=projects`}>
                    <Button size="sm" variant="outline">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {projects.map((p: any) => (
                      <div key={p.id} className="flex items-start justify-between p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-900 hover:shadow-md transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FolderKanban className="w-4 h-4 text-purple-600" />
                            <p className="font-semibold">{p.title}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Stages: {p.Stage.length}</span>
                            <span>Assignees: {p.assignments.length}</span>
                            <Badge variant="outline">{p.priority}</Badge>
                          </div>
                        </div>
                        <form action={deleteTask}>
                          <input type="hidden" name="taskId" value={p.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-center py-12">
                        <FolderKanban className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-muted-foreground">No projects found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo className="w-5 h-5" />
                      Standalone Tasks ({tasks.filter((t: any) => !(t.Stage && t.Stage.length > 0)).length})
                    </CardTitle>
                    <CardDescription>Individual tasks without project stages</CardDescription>
                  </div>
                  <Link href={`/superadmin?orgId=${organization.id}&tab=tasks`}>
                    <Button size="sm" variant="outline">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {tasks.filter((t: any) => !(t.Stage && t.Stage.length > 0)).map((t: any) => (
                      <div key={t.id} className="flex items-start justify-between p-4 rounded-lg border bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-gray-900 hover:shadow-md transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ListTodo className="w-4 h-4 text-green-600" />
                            <p className="font-semibold">{t.title}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <Badge variant="outline">{t.priority}</Badge>
                            <Badge variant={t.status === 'DONE' ? 'default' : 'secondary'}>{t.status}</Badge>
                            <span>Assignees: {t.assignments.length}</span>
                          </div>
                        </div>
                        <form action={deleteTask}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    ))}
                    {tasks.filter((t: any) => !(t.Stage && t.Stage.length > 0)).length === 0 && (
                      <div className="text-center py-12">
                        <ListTodo className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-muted-foreground">No standalone tasks found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5" />
                      Channels ({channels.length})
                    </CardTitle>
                    <CardDescription>Communication channels</CardDescription>
                  </div>
                  <Link href={`/superadmin?orgId=${organization.id}&tab=channels`}>
                    <Button size="sm" variant="outline">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {channels.map((c: any) => (
                      <div key={c.id} className="flex items-start justify-between p-4 rounded-lg border bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-900 hover:shadow-md transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-orange-600" />
                            <p className="font-semibold">{c.name}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Members: {c._count.members}</span>
                            <span>Messages: {c._count.messages}</span>
                            <Badge variant={c.isPublic ? 'default' : 'secondary'}>
                              {c.isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                        </div>
                        <form action={deleteChannel}>
                          <input type="hidden" name="channelId" value={c.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    ))}
                    {channels.length === 0 && (
                      <div className="text-center py-12">
                        <Hash className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-muted-foreground">No channels found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab  */}
          <TabsContent value="tools" className="space-y-4">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Broadcast Announcement
                </CardTitle>
                <CardDescription>Send a message to all users in this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={broadcastAnnouncement} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Announcement Title</Label>
                    <Input id="title" name="title" placeholder="Important Update" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" placeholder="Enter your announcement message..." rows={4} required />
                  </div>
                  <input type="hidden" name="orgId" value={organization.id} />
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Megaphone className="w-4 h-4 mr-2" />
                    Publish Announcement
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityLogViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
