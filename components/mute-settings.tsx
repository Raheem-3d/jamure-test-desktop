"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, BellOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface MuteSettings {
  userId: string
  taskId: string
  isMuted: boolean
}

interface MuteSettingsProps {
  taskId: string
  assignees: User[]
  muteSettings: MuteSettings[]
  onMuteChange: (muteSettings: MuteSettings[]) => void
}

export function MuteSettings({ taskId, assignees, muteSettings, onMuteChange }: MuteSettingsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const isMuted = (userId: string) => muteSettings.find((m) => m.userId === userId)?.isMuted || false

  const handleMuteToggle = async (userId: string, currentlyMuted: boolean) => {
    setLoading(userId)
    try {
      const response = await fetch(`/api/tasks/${taskId}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          isMuted: !currentlyMuted,
        }),
      })

      if (!response.ok) throw new Error("Failed to update mute settings")

      // Update local state
      const updatedSettings = muteSettings.map((setting) =>
        setting.userId === userId ? { ...setting, isMuted: !currentlyMuted } : setting,
      )

      // Add new setting if it doesn't exist
      if (!muteSettings.find((m) => m.userId === userId)) {
        updatedSettings.push({
          userId,
          taskId,
          isMuted: !currentlyMuted,
        })
      }

      onMuteChange(updatedSettings)

      const user = assignees.find((a) => a.id === userId)
      toast({
        title: !currentlyMuted ? "Notifications Muted" : "Notifications Unmuted",
        description: `${user?.name}'s notifications have been ${!currentlyMuted ? "muted" : "unmuted"}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update mute settings",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  if (assignees?.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <BellOff className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No assignees to manage notifications for.</p>
        <p className="text-sm">Assign users to this task first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {assignees?.map((assignee) => {
        const muted = isMuted(assignee.id)
        const isLoading = loading === assignee.id

        return (
          <div key={assignee.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={assignee.avatar || "/placeholder.svg"} />
                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{assignee.name}</p>
                <p className="text-sm text-gray-600">{assignee.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  {muted ? (
                    <>
                      <BellOff className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-500">Muted</span>
                    </>
                  ) : (
                    <>
                      <Bell className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">Active</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor={`mute-${assignee.id}`} className="text-sm">
                {muted ? "Muted" : "Active"}
              </Label>
              <Switch
                id={`mute-${assignee.id}`}
                checked={!muted}
                onCheckedChange={() => handleMuteToggle(assignee.id, muted)}
                disabled={isLoading}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
