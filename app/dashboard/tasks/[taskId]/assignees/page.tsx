"use client"

import { useState, useEffect } from "react"
import { useParams,useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Bell, Users, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AssigneeManager } from "@/components/assignee-manager"
import { toast } from "sonner"
import { RoleBasedAccess } from "@/lib/role-based-access"
import { useTeamUsers } from "@/hooks/use-team-users"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface Task {
  id: string
  title: string
  description: string
  assignees: User[]
}

interface Reminder {
  id: string
  taskId: string
  assigneeId: string
  reminderDate: string
  message?: string
  createdBy: string
}

interface MuteSettings {
  userId: string
  taskId: string
  isMuted: boolean
}

interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
}

export default function TaskAssigneesPage() {
  const params = useParams()
  const taskId = params.taskId as string
  // const { toast } = useToast()

  const [task, setTask] = useState<Task | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [muteSettings, setMuteSettings] = useState<MuteSettings[]>([])
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  // Use the new hook to get team users
  const { users: allUsers, loading: usersLoading } = useTeamUsers()

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch task details with assignees
        const taskResponse = await fetch(`/api/tasks/${taskId}`)
        if (!taskResponse.ok) throw new Error("Failed to fetch task")
        const taskData = await taskResponse.json()
        setTask(taskData)

        // Fetch assignees
        const assigneesResponse = await fetch(`/api/tasks/${taskId}/assignees`)
        if (assigneesResponse.ok) {
          const assigneesData = await assigneesResponse.json()
          setTask((prev) => (prev ? { ...prev, assignees: assigneesData } : null))
        }

        // Fetch mute settings
        const muteResponse = await fetch(`/api/tasks/${taskId}/mute`)
        if (muteResponse.ok) {
          const muteData = await muteResponse.json()
          setMuteSettings(muteData)
        }

        // Fetch user notification preferences
        const notifResponse = await fetch("/api/users/me/notifications")
        if (notifResponse.ok) {
          const notifData = await notifResponse.json()
          setNotificationPrefs(notifData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        toast("Error",{
          description: "Failed to load task assignees data",
        })
      } finally {
        setLoading(false)
      }
    }

    if (taskId) {
      fetchData()
    }
  }, [taskId, toast])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error: {error || "Task not found"}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <RoleBasedAccess
     allowedRoles={["ORG_ADMIN", "MANAGER"]}
      fallback={
        <div className="max-w-2xl mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to edit this task</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Only admins and managers can edit tasks.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      }
    >

        <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Users className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Manage Assignees</h1>
          <p className="text-gray-600">Task: {task.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Task Assignees
            </CardTitle>
            <CardDescription>Assign or unassign users from this task</CardDescription>
          </CardHeader>
          <CardContent>
            <AssigneeManager
              taskId={taskId}
              allUsers={allUsers}
              assignees={task.assignees}
              onAssigneesChange={(newAssignees) =>
                setTask((prev) => (prev ? { ...prev, assignees: newAssignees } : null))
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>

    </RoleBasedAccess>
  
  )
}
