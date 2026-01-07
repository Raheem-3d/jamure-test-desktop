

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, addDays } from "date-fns"
import { Clock, Plus, Bell, BellOff, Trash2, User, CheckCircle, AlertTriangle, Calendar, Settings, Filter, MoreVertical, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface I_User {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

interface Reminder {
  id: string
  title: string
  description?: string
  remindAt: string
  isMuted: boolean
  isSent: boolean
  priority: string
  type: string
  creatorId: string
  assigneeId: string
  creator: I_User
  assignee: I_User
  createdAt: string
  sentAt?: string
}

interface RemindersDashboardProps {
  currentUser: I_User
  reminders: Reminder[]
  users: I_User[]
}

export function RemindersDashboard({ currentUser, reminders: initialReminders, users }: RemindersDashboardProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [filter, setFilter] = useState("all")
  const { toast } = useToast()
  const router = useRouter();

  const toggleMute = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/toggle-mute`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setReminders((prev) =>
          prev.map((reminder) => (reminder.id === reminderId ? { ...reminder, isMuted: !reminder.isMuted } : reminder)),
        )
        toast({
          title: "Success",
          description: `Reminder ${data.action}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle mute",
        variant: "destructive",
      })
    }
  }

  const deleteReminder = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setReminders((prev) => prev.filter((reminder) => reminder.id !== reminderId))
        toast({
          title: "Success",
          description: "Reminder deleted successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "HIGH":
        return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
      case "MEDIUM":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "LOW":
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
    }
  }

  const getStatusColor = (reminder: Reminder) => {
    const now = new Date()
    const remindTime = new Date(reminder.remindAt)

    if (reminder.isSent) return "text-green-600 dark:text-green-400"
    if (isBefore(remindTime, now)) return "text-red-600 dark:text-red-400"
    if (isBefore(remindTime, addDays(now, 1))) return "text-orange-600 dark:text-orange-400"
    return "text-blue-600 dark:text-blue-400"
  }

  const getStatusIcon = (reminder: Reminder) => {
    const now = new Date()
    const remindTime = new Date(reminder.remindAt)

    if (reminder.isSent) return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
    if (isBefore(remindTime, now)) return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
    if (isBefore(remindTime, addDays(now, 1))) return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
    return <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  }

  const getFilteredReminders = () => {
    const now = new Date()

    switch (filter) {
      case "upcoming":
        return reminders.filter((r) => isAfter(new Date(r.remindAt), now) && !r.isSent)
      case "overdue":
        return reminders.filter((r) => isBefore(new Date(r.remindAt), now) && !r.isSent)
      case "sent":
        return reminders.filter((r) => r.isSent)
      case "muted":
        return reminders.filter((r) => r.isMuted)
      case "assigned":
        return reminders.filter((r) => r.assigneeId === currentUser.id)
      case "created":
        return reminders.filter((r) => r.creatorId === currentUser.id)
      default:
        return reminders
    }
  }

  const filteredReminders = getFilteredReminders()
  const upcomingCount = reminders.filter((r) => isAfter(new Date(r.remindAt), new Date()) && !r.isSent).length
  const overdueCount = reminders.filter((r) => isBefore(new Date(r.remindAt), new Date()) && !r.isSent).length
  const sentCount = reminders.filter((r) => r.isSent).length

  const StatCard = ({ title, value, icon: Icon, color, description }: any) => (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
          <div className={cn("p-3 rounded-xl", color.replace('text', 'bg').replace('-600', '-100 dark:bg-gray-700'))}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
         
          <div>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 mx-2 bg-blue-800/30 hover:bg-blue-800/40 border-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reminders</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your reminders and stay on top of important tasks
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/reminders/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Reminder
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ">
          <StatCard
          className='dark:bg-gray-900'
            title="Total Reminders"
            value={reminders.length}
            icon={Calendar}
            color="text-gray-600 dark:text-gray-400  "
            description="All reminders"
          />
          <StatCard
            title="Upcoming"
            value={upcomingCount}
            icon={Clock}
            color="text-blue-600 dark:text-blue-400"
            description="Scheduled reminders"
          />
          <StatCard
            title="Overdue"
            value={overdueCount}
            icon={AlertTriangle}
            color="text-red-600 dark:text-red-400"
            description="Require attention"
          />
          <StatCard
            title="Completed"
            value={sentCount}
            icon={CheckCircle}
            color="text-green-600 dark:text-green-400"
            description="Sent reminders"
          />
        </div>

        {/* Main Content */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-gray-900 dark:text-white">Your Reminders</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {filteredReminders.length} reminder{filteredReminders.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              
              {/* Filter Tabs */}
              <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full sm:w-auto">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
                  <TabsTrigger value="overdue" className="text-xs">Overdue</TabsTrigger>
                  <TabsTrigger value="sent" className="text-xs">Sent</TabsTrigger>
                  <TabsTrigger value="muted" className="text-xs hidden sm:flex">Muted</TabsTrigger>
                  <TabsTrigger value="assigned" className="text-xs hidden sm:flex">Assigned</TabsTrigger>
                  <TabsTrigger value="created" className="text-xs hidden sm:flex">Created</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredReminders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reminders found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {filter === "all" 
                    ? "You don't have any reminders set up yet. Create your first reminder to stay organized." 
                    : `No ${filter} reminders match your current filter.`
                  }
                </p>
                <Link href="/dashboard/reminders/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Reminder
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredReminders.map((reminder) => (
                  <div key={reminder.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(reminder)}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{reminder.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs font-medium", getPriorityColor(reminder.priority))}>
                              {reminder.priority}
                            </Badge>
                            {reminder.isMuted && (
                              <Badge variant="outline" className="text-xs">
                                <BellOff className="h-3 w-3 mr-1" />
                                Muted
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {reminder.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {reminder.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className={cn("font-medium", getStatusColor(reminder))}>
                              {format(new Date(reminder.remindAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={reminder.creator.image} alt={reminder.creator.name} />
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                                  {reminder.creator.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-600 dark:text-gray-400">From {reminder.creator.name}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={reminder.assignee.image} alt={reminder.assignee.name} />
                                <AvatarFallback className="text-xs bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                                  {reminder.assignee.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-600 dark:text-gray-400">To {reminder.assignee.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {reminder.assigneeId === currentUser.id && !reminder.isSent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMute(reminder.id)}
                            className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
                            title={reminder.isMuted ? "Unmute reminder" : "Mute reminder"}
                          >
                            {reminder.isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                          </Button>
                        )}

                        {(reminder.creatorId === currentUser.id || currentUser.role === "ORG_ADMIN") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => deleteReminder(reminder.id)}
                                className="text-red-600 dark:text-red-400 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Reminder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}