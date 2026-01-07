

"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"

type Notification = {
  id: string
  type: string
  content: string
  userId: string
  read: boolean
  createdAt: string
  messageId?: string | null
  taskId?: string | null
  channelId?: string | null
  senderId?: string | null
  receiverId?: string | null
}

type NotificationsContextType = {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearNotifications: () => Promise<void>
  refreshNotifications: () => Promise<void>
  isLoading: boolean
  error: string | null

}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {


  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const pathname = usePathname()

  const refreshNotifications = useCallback(async () => {
    if (!session?.user?.id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }
      
      const data = await response.json()
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError(err instanceof Error ? err.message : "Failed to load notifications")
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id])

  const markAsRead = useCallback(async (id: string) => {
    try {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // await fetch(`/api/notifications/${id}/read`, {
      //   method: "PATCH",
      // })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      // Rollback on error
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      )
      setUnreadCount(prev => prev + 1)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      // Rollback would require re-fetching
      refreshNotifications()
    }
  }, [refreshNotifications])

  const clearNotifications = useCallback(async () => {
    try {
      setNotifications([])
      setUnreadCount(0)
      
      await fetch("/api/notifications/clear", {
        method: "DELETE",
      })
    } catch (error) {
      console.error("Error clearing notifications:", error)
      refreshNotifications()
    }
  }, [refreshNotifications])

  // Initial fetch and socket setup
  useEffect(() => {
    if (!session?.user?.id) return

    // Fetch initial notifications
    refreshNotifications()

    // Socket notification handler 
    
    const handleSocketNotification = (event: Event) => {
      const customEvent = event as CustomEvent<Notification>
      const notification = customEvent.detail
      
      // Validate notification structure
      if (!notification || !notification.id || notification.userId !== session.user.id) {
        return
      }

      setNotifications(prev => {
        // Check for duplicates
        if (prev.some(n => n.id === notification.id)) {
          return prev
        }
        
        // Optimistically update unread count
        if (!notification.read) {
          setUnreadCount(prev => prev + 1)
        }
        
        return [notification, ...prev]
      })
    }

    // Handle message deletion - remove associated notifications immediately
    const handleMessageDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string }>
      const { messageId } = customEvent.detail
      
      if (!messageId) return

      setNotifications(prev => {
        // Filter out notifications related to the deleted message
        const updatedNotifications = prev.filter(n => {
          // Remove notifications that reference this messageId
          // or notifications that ARE this message (notification.id === messageId)
          return n.messageId !== messageId && n.id !== messageId
        })
        
        const removedCount = prev.length - updatedNotifications.length
        
        // Update unread count for removed notifications
        if (removedCount > 0) {
          const removedUnread = prev.filter(n => 
            (n.messageId === messageId || n.id === messageId) && !n.read
          ).length
          setUnreadCount(current => Math.max(0, current - removedUnread))
        }
        
        return updatedNotifications
      })
    }

    window.addEventListener("socket-notification", handleSocketNotification)
    window.addEventListener("message:deleted", handleMessageDeleted as EventListener)

    return () => {
      window.removeEventListener("socket-notification", handleSocketNotification)
      window.removeEventListener("message:deleted", handleMessageDeleted as EventListener)
    }
  }, [session?.user?.id, refreshNotifications])

  // Auto-mark as read when viewing relevant content
  useEffect(() => {
    if (!session?.user?.id || notifications.length === 0) return

    const relevantNotifications = notifications.filter(n => 
      !n.read && (
        (n.channelId && pathname.includes(`/channels/${n.channelId}`)) ||
        (n.messageId && pathname.includes("/messages/")) ||
        (n.taskId && pathname.includes(`/tasks/${n.taskId}`))
      )
    )

    if (relevantNotifications.length > 0) {
      const markRelevantAsRead = async () => {
        try {
          await Promise.all(
            relevantNotifications.map(n => markAsRead(n.id))
          )
        } catch (error) {
          console.error("Error marking relevant notifications as read:", error)
        }
      }
      
      markRelevantAsRead()
    }
  }, [pathname, notifications, session?.user?.id, markAsRead])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
        isLoading,
        error
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}
