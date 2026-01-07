"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, X } from "lucide-react"
import { toast } from "sonner"

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [showCard, setShowCard] = useState(false)

  useEffect(() => {
    // Check if browser supports notifications
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
      // Show card if permission is not granted
      setShowCard(Notification.permission === "default")
    }
  }, [])

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const result = await Notification.requestPermission()
        setPermission(result)

        if (result === "granted") {
          toast.success("Browser notifications enabled!")
          setShowCard(false)

          // Show test notification
          new Notification("Notifications Enabled", {
            body: "You'll now receive reminder notifications",
            icon: "/favicon.ico",
          })
        } else {
          toast.error("Notification permission denied")
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error)
        toast.error("Failed to request notification permission")
      }
    }
  }

  if (typeof window === "undefined" || !("Notification" in window) || !showCard) {
    return null
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Enable Notifications</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCard(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Get instant notifications for reminders, tasks, and messages</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <Button onClick={requestPermission} size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Enable Notifications
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowCard(false)}>
            <BellOff className="h-4 w-4 mr-2" />
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
