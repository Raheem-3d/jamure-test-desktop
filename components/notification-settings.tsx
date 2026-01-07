

"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Mail, Smartphone, MessageSquare, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NotificationPreferences {
  // email: boolean
  push: boolean
  sms: boolean
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences
  onPreferencesChange: (preferences: NotificationPreferences) => void
}

export default  function NotificationSettings({ preferences, onPreferencesChange }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = (type: keyof NotificationPreferences) => {
    onPreferencesChange({
      ...preferences,
      [type]: !preferences[type],
    })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users/me/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) throw new Error("Failed to save notification preferences")

      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Email Notifications */}
     

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-green-600" />
            <div>
              <Label className="font-medium">Push Notifications</Label>
              <p className="text-sm text-gray-600">Receive browser push notifications</p>
            </div>
          </div>
          <Switch checked={preferences.push} onCheckedChange={() => handleToggle("push")} />
        </div>

        {/* SMS Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <div>
              <Label className="font-medium">SMS Notifications</Label>
              <p className="text-sm text-gray-600">Receive text message alerts</p>
            </div>
          </div>
          <Switch checked={preferences.sms} onCheckedChange={() => handleToggle("sms")} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  )
}
