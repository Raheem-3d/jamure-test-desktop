"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MultiSelect, MultiSelectItem } from "@/components/multi-select"
import { useToast } from "@/components/ui/use-toast"
import { useSocket } from "@/lib/socket-client"
import { RoleBasedAccess } from "@/lib/role-based-access"
import { useTeamUsers } from "@/hooks/use-team-users"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type User = {
  id: string
  name: string
  email: string
}

export default function EditTaskPage() {
  const [task, setTask] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [status, setStatus] = useState("TODO")
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [assignees, setAssignees] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { sendTaskUpdate, sendNotification } = useSocket()
  const taskId = params.taskId as string
  const { users, loading: usersLoading } = useTeamUsers()

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsFetching(true)
        const taskRes = await fetch(`/api/tasks/${taskId}`)

        if (!taskRes.ok) {
          throw new Error("Failed to fetch task")
        }

        const taskData = await taskRes.json()
        setTask(taskData)
        setTitle(taskData.title)
        setDescription(taskData.description || "")
        setPriority(taskData.priority)
        setStatus(taskData.status)
        setDeadline(taskData.deadline ? new Date(taskData.deadline) : undefined)
        setAssignees(taskData.assignments.map((a: any) => a.userId))
      } catch (error) {
        console.error("Error fetching task:", error)
        toast({
          title: "Error",
          description: "Failed to load task data",
          variant: "destructive",
        })
        router.push("/dashboard/tasks")
      } finally {
        setIsFetching(false)
      }
    }

    if (taskId) {
      fetchTask()
    }
  }, [taskId, toast, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          deadline,
          assignees,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const updatedTask = await response.json()

      // Send task update via socket
      sendTaskUpdate(updatedTask)

      // Send notifications to assignees
      const newAssignees = assignees.filter((id) => !task.assignments.some((a: any) => a.userId === id))

      if (newAssignees.length > 0) {
        newAssignees.forEach((assigneeId) => {
          sendNotification(assigneeId, {
            type: "TASK_ASSIGNED",
            content: `You have been assigned to task: ${title}`,
          })
        })
      }

      toast({
        title: "Task Updated",
        description: "The task has been updated successfully",
      })
      router.push(`/dashboard/tasks/${taskId}`)
      router.refresh()
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully",
      })
      router.push("/dashboard/tasks")
      router.refresh()
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }


  

  return (
    <RoleBasedAccess
      allowedRoles={["ADMIN", "MANAGER"]}
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
      <div className="max-w-2xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Task</CardTitle>
            <CardDescription>Update task details and assignees</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Assignees</Label>
                <MultiSelect placeholder="Select assignees" value={assignees} onChange={setAssignees}>
                  {users.map((user) => (
                    <MultiSelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MultiSelectItem>
                  ))}
                </MultiSelect>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="destructive" 
                type="button" 
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Task"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task
                "{title}" and all associated data including comments and assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Task"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleBasedAccess>
  )
}
