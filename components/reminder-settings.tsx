"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Clock, Plus } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface Reminder {
  id: string
  taskId: string
  assigneeId: string
  reminderDate: string
  message?: string
  createdBy: string
}

interface ReminderSettingsProps {
  taskId: string
  assignees: User[]
  reminders: Reminder[]
  onReminderSet: (reminder: Reminder) => void
}

export function ReminderSettings({ taskId, assignees, reminders, onReminderSet }: ReminderSettingsProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>("")
  const [reminderDate, setReminderDate] = useState<Date>()
  const [reminderTime, setReminderTime] = useState<string>("09:00")
  const [message, setMessage] = useState<string>("")
  const [loading, setLoading] = useState(false)
  // const { toast } = useToast()



  console.log(assignees,'assigne')


  const handleSetReminder = async () => {
    if (!selectedAssignee || !reminderDate) {
      toast("Missing Information",{
        description: "Please select an assignee and date",
      })
      return
    }

    setLoading(true)
    try {
      // Combine date and time
      const [hours, minutes] = reminderTime.split(":")
      const reminderDateTime = new Date(reminderDate)
      reminderDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes))

      const response = await fetch(`/api/tasks/${taskId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: selectedAssignee,
          reminderDate: reminderDateTime.toISOString(),
          message: message.trim() || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to set reminder")

      const newReminder = await response.json()
      onReminderSet(newReminder)

      // Reset form
      setSelectedAssignee("")
      setReminderDate(undefined)
      setReminderTime("09:00")
      setMessage("")

      // Show success toast (this will be shown by parent component)
    } catch (error) {
      toast( "Error",{
        description: error instanceof Error ? error.message : "Failed to set reminder",
      })
    } finally {
      setLoading(false)
    }
  }

  const getAssigneeReminders = (assigneeId: string) => reminders.filter((r) => r.assigneeId === assigneeId)

  if (assignees?.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No assignees to set reminders for.</p>
        <p className="text-sm">Assign users to this task first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Set New Reminder */}
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <h4 className="font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Set New Reminder
        </h4>

        {/* Select Assignee */}
        <div className="space-y-2">
          <Label>Select Assignee</Label>
          <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an assignee..." />
            </SelectTrigger>
            <SelectContent>
              {assignees?.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={assignee.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">{assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {assignee.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Reminder Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {reminderDate ? format(reminderDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={reminderDate} onSelect={setReminderDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Reminder Time</Label>
          <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
        </div>

        {/* Optional Message */}
        <div className="space-y-2">
          <Label>Custom Message (Optional)</Label>
          <Textarea
            placeholder="Add a custom reminder message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={handleSetReminder} disabled={loading} className="w-full">
          {loading ? "Setting Reminder..." : "Set Reminder"}
        </Button>
      </div>

      {/* Existing Reminders */}
      <div className="space-y-4">
        <h4 className="font-medium">Existing Reminders</h4>
        {assignees?.map((assignee) => {
          const assigneeReminders = getAssigneeReminders(assignee.id)
          return (
            <div key={assignee.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={assignee.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{assignee.name}</p>
                  <p className="text-sm text-gray-600">{assigneeReminders.length} reminder(s)</p>
                </div>
              </div>

              {assigneeReminders.length > 0 ? (
                <div className="space-y-2">
                  {assigneeReminders.map((reminder) => (
                    <div key={reminder.id} className="text-sm bg-blue-50 p-2 rounded">
                      <p className="font-medium">{format(new Date(reminder.reminderDate), "PPP 'at' p")}</p>
                      {reminder.message && <p className="text-gray-600 mt-1">{reminder.message}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No reminders set</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
