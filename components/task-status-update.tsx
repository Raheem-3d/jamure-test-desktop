"use client"; 

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useSocket } from "@/lib/socket-client"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type TaskStatusUpdateProps = {
  taskId: string
  currentStatus: string
  onStatusUpdate?: (newStatus: string) => void
}

export default function TaskStatusUpdate({ taskId, currentStatus, onStatusUpdate }: TaskStatusUpdateProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  // const { toast } = useToast()
  // const { sendTaskUpdate, sendNotification } = useSocket()
  const { user } = useAuth()




  console.log(taskId,'taskid')

  const handleStatusChange = async () => {
    if (status === currentStatus) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task status")
      }

      const updatedTask = await response.json()

    

      toast("Status Updated",{
        description: "Task status has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating task status:", error)
      toast("Error",{
        description: "Failed to update task status",
      })
      setStatus(currentStatus) // Reset to current status on error
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Select value={status} onValueChange={setStatus} disabled={isUpdating}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODO">To Do</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="BLOCKED">Blocked</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleStatusChange} disabled={status === currentStatus || isUpdating}>
        {isUpdating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          "Update"
        )}
      </Button>
    </div>
  )
}
