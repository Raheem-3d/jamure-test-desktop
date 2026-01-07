"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { CalendarIcon, Clock, Plus, Bell, BellOff, Trash2, User, CheckCircle, Play, Pause } from "lucide-react"

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
  creator: I_User
  assignee: I_User
  createdAt: string
  sentAt?: string
}

interface ReminderManagerProps {
  currentUser: I_User
  users: I_User[]
}

export function ReminderManager({ currentUser, users }: ReminderManagerProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [processorStatus, setProcessorStatus] = useState<any>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    remindAt: new Date(),
    assigneeId: currentUser.id,
    priority: "MEDIUM",
    type: "GENERAL",
  })

  useEffect(() => {
    fetchReminders()
    if (currentUser.role === "ORG_ADMIN") {
      fetchProcessorStatus()
    }
  }, [])

  const fetchReminders = async () => {
    try {
      const response = await fetch("/api/reminders")
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch reminders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessorStatus = async () => {
    try {
      const response = await fetch("/api/reminders/processor")
      if (response.ok) {
        const data = await response.json()
        setProcessorStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch processor status:", error)
    }
  }

  const createReminder = async () => {
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          remindAt: formData.remindAt.toISOString(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Reminder created successfully",
        })
        setShowCreateForm(false)
        setFormData({
          title: "",
          description: "",
          remindAt: new Date(),
          assigneeId: currentUser.id,
          priority: "MEDIUM",
          type: "GENERAL",
        })
        fetchReminders()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create reminder",
        variant: "destructive",
      })
    }
  }

  const toggleMute = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/toggle-mute`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: `Reminder ${data.action}`,
        })
        fetchReminders()
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
        toast({
          title: "Success",
          description: "Reminder deleted",
        })
        fetchReminders()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      })
    }
  }

  const controlProcessor = async (action: string) => {
    try {
      const response = await fetch("/api/reminders/processor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message,
        })
        fetchProcessorStatus()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to control processor",
        variant: "destructive",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800"
      case "HIGH":
        return "bg-orange-100 text-orange-800"
      case "MEDIUM":
        return "bg-blue-100 text-blue-800"
      case "LOW":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="p-6">Loading reminders...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reminder System</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Reminder
        </Button>
      </div>

      {/* Processor Status (Admin Only) */}
      {currentUser.role === "ORG_ADMIN" && processorStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Processor Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  Status:
                  <Badge variant={processorStatus.isRunning ? "default" : "secondary"}>
                    {processorStatus.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </p>
                <p>Upcoming: {processorStatus.upcomingReminders}</p>
                <p>Overdue: {processorStatus.overdueReminders}</p>
              </div>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => controlProcessor(processorStatus.isRunning ? "stop" : "start")}
                >
                  {processorStatus.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => controlProcessor("process")}>
                  Process Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Reminder Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Reminder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Reminder title..."
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assignee</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.id === currentUser.id && "(You)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="TASK_DEADLINE">Task Deadline</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Remind At</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.remindAt, "PPP 'at' p")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.remindAt}
                      onSelect={(date) => date && setFormData({ ...formData, remindAt: date })}
                    />
                    <div className="p-3 border-t">
                      <Input
                        type="datetime-local"
                        value={format(formData.remindAt, "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => setFormData({ ...formData, remindAt: new Date(e.target.value) })}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createReminder}>Create Reminder</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Reminders</h2>
        {reminders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No reminders found. Create your first reminder!
            </CardContent>
          </Card>
        ) : (
          reminders.map((reminder) => (
            <Card key={reminder.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{reminder.title}</h3>
                      <Badge className={getPriorityColor(reminder.priority)}>{reminder.priority}</Badge>
                      <Badge variant="outline">{reminder.type}</Badge>
                      {reminder.isSent && (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sent
                        </Badge>
                      )}
                    </div>

                    {reminder.description && <p className="text-gray-600 mb-2">{reminder.description}</p>}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(reminder.remindAt), "PPP 'at' p")}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        From: {reminder.creator.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        To: {reminder.assignee.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {reminder.assigneeId === currentUser.id && (
                      <Button size="sm" variant="outline" onClick={() => toggleMute(reminder.id)}>
                        {reminder.isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                      </Button>
                    )}

                    {(reminder.creatorId === currentUser.id || currentUser.role === "ORG_ADMIN") && (
                      <Button size="sm" variant="outline" onClick={() => deleteReminder(reminder.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
