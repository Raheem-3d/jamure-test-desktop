

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format, addMinutes } from "date-fns"
import { CalendarIcon, Bell, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type TaskReminder = {
  id: string
  title: string
  description?: string
  remindAt: string
  priority: string
  type: string
  isMuted: boolean
  isSent: boolean
}

type TaskReminderProps = {
  taskId: string
  taskTitle: string
  taskDeadline?: string
  reminders: TaskReminder[]
  onRemindersChange?: (reminders: TaskReminder[]) => void
}

export default function TaskReminder({
  taskId,
  taskTitle,
  taskDeadline,
  reminders,
  onRemindersChange,
}: TaskReminderProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(taskDeadline ? new Date(taskDeadline) : new Date())
  const [selectedTime, setSelectedTime] = useState("1-hour")
  const [customTitle, setCustomTitle] = useState("")
  const [customDescription, setCustomDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const { toast } = useToast()

  const timeOptions = [
    { value: "15-minutes", label: "15 minutes before", minutes: 15 },
    { value: "30-minutes", label: "30 minutes before", minutes: 30 },
    { value: "1-hour", label: "1 hour before", minutes: 60 },
    { value: "2-hours", label: "2 hours before", minutes: 120 },
    { value: "1-day", label: "1 day before", minutes: 1440 },
    { value: "custom", label: "Custom time", minutes: 0 },
  ]

  useEffect(() => {
    if (taskDeadline) {
      setSelectedDate(new Date(taskDeadline))
    }
  }, [taskDeadline])

  const handleSetReminder = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const timeOption = timeOptions.find((option) => option.value === selectedTime)
      let reminderTime = selectedDate

      if (timeOption && timeOption.minutes > 0) {
        reminderTime = addMinutes(selectedDate, -timeOption.minutes)
      }

      const reminderData = {
        title: customTitle || `Task Reminder: ${taskTitle}`,
        description: customDescription || `Reminder for task: ${taskTitle}`,
        remindAt: reminderTime.toISOString(),
        priority: priority,
        type: "TASK_DEADLINE",
        taskId: taskId,
      }

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reminderData),
      })

      if (!response.ok) {
        throw new Error("Failed to set reminder")
      }

      const newReminder = await response.json()
      const updatedReminders = [...reminders, newReminder]
      onRemindersChange?.(updatedReminders)

      toast({
        title: "Reminder Set",
        description: `Reminder set for ${format(reminderTime, "PPP 'at' p")}`,
      })

      // Reset form
      setCustomTitle("")
      setCustomDescription("")
      setPriority("MEDIUM")
      setShowCustomForm(false)
    } catch (error) {
      console.error("Error setting reminder:", error)
      toast({
        title: "Error",
        description: "Failed to set reminder",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReminder = async (reminderId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete reminder")
      }

      const updatedReminders = reminders.filter((reminder) => reminder.id !== reminderId)
      onRemindersChange?.(updatedReminders)

      toast({
        title: "Reminder Deleted",
        description: "Reminder has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting reminder:", error)
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMute = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/toggle-mute`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to toggle mute")
      }

      const data = await response.json()
      const updatedReminders = reminders.map((reminder) =>
        reminder.id === reminderId ? { ...reminder, isMuted: !reminder.isMuted } : reminder,
      )
      onRemindersChange?.(updatedReminders)

      toast({
        title: "Success",
        description: `Reminder ${data.action}`,
      })
    } catch (error) {
      console.error("Error toggling mute:", error)
      toast({
        title: "Error",
        description: "Failed to toggle mute",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Task Reminders
        </CardTitle>
        <CardDescription>Set reminders for this task</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Reminders */}
        {reminders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Active Reminders</h4>
            <div className="space-y-2">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{reminder.title}</p>
                    {reminder.description && <p className="text-xs text-gray-500">{reminder.description}</p>}
                    <p className="text-xs text-gray-500">{format(new Date(reminder.remindAt), "PPP 'at' p")}</p>
                    <div className="flex gap-1 mt-1">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          reminder.priority === "URGENT"
                            ? "bg-red-100 text-red-800"
                            : reminder.priority === "HIGH"
                              ? "bg-orange-100 text-orange-800"
                              : reminder.priority === "MEDIUM"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {reminder.priority}
                      </span>
                      {reminder.isMuted && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Muted</span>
                      )}
                      {reminder.isSent && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Sent</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMute(reminder.id)}
                      disabled={isLoading || reminder.isSent}
                      title={reminder.isMuted ? "Unmute" : "Mute"}
                    >
                      <Bell className={`h-4 w-4 ${reminder.isMuted ? "opacity-50" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      disabled={isLoading}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Set Reminder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Set New Reminder</h4>
            <Button variant="outline" size="sm" onClick={() => setShowCustomForm(!showCustomForm)}>
              {showCustomForm ? "Quick Setup" : "Custom Setup"}
            </Button>
          </div>

          {showCustomForm ? (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Title</Label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={`Task Reminder: ${taskTitle}`}
                />
              </div>

              <div>
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
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

                <div>
                  <Label className="text-sm">Remind Before</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTime === "custom" && (
                <div>
                  <Label className="text-sm">Custom Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP 'at' p") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                      <div className="p-3 border-t">
                        <Input
                          type="datetime-local"
                          value={selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Task Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm">Remind Before</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button onClick={handleSetReminder} disabled={isLoading || !selectedDate} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? "Setting Reminder..." : "Set Reminder"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


// 