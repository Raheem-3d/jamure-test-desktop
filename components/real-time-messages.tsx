

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSocket } from "@/lib/socket-client"
import MessageList from "@/components/message-list"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

type Message = {
  id: string
  content: string
  senderId: string
  receiverId?: string
  channelId?: string
  fileUrls?: string[]
  createdAt: string
  reactions?: { emoji: string; userId: string; userName?: string }[]
  sender: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

type RealTimeMessagesProps = {
  initialMessages: Message[]
  channelId?: string
  receiverId?: string
  onlineUsers?: string[]
}

export default function RealTimeMessages({ initialMessages, channelId, receiverId,onlineUsers }: RealTimeMessagesProps) {
  // ============================================
  // ALL HOOKS MUST BE CALLED FIRST (NO CONDITIONS)
  // ============================================
  
  // Step 1: Call all hooks unconditionally
  const { data: session } = useSession()
  const { isConnected, connectionAttempted, joinChannel, leaveChannel } = useSocket()
  
  // Step 2: Derived values BEFORE state that uses them
  const currentUserId = (session as any)?.user?.id
  const INITIAL_LIMIT = 50
  const LOAD_MORE_LIMIT = 100
  
  // Step 3: Helper function for initial state (NOT useCallback yet)
  const normalizeMessage = (m: any): Message => {
    const msg: any = {...m, sender: { ...m.sender, image: m.sender?.image ?? null }, }

    try {
      const seenBy: string[] = Array.isArray(msg.seenBy) ? msg.seenBy : []
      if (currentUserId && msg.senderId === currentUserId) {
        const createdAt = msg.createdAt ? new Date(msg.createdAt).getTime() : 0
        const ageMs = Date.now() - createdAt
        const OTHER_READ_AGE_THRESHOLD = 3000
        const otherSaw = seenBy.some((id) => id && id !== currentUserId)
        if (otherSaw && ageMs > OTHER_READ_AGE_THRESHOLD) msg.status = "read"
      }
    } catch (e) {
      // ignore

    }
    return msg as Message
  }
  
  // Step 4: State initialization using the helper
  const [messages, setMessages] = useState<Message[]>(() =>
    (initialMessages || []).map(normalizeMessage)
  )
  
  // Step 5: Define refs and remaining state
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevLastMessageIdRef = useRef<string | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [isScrolling, setIsScrolling] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hasMore, setHasMore] = useState<boolean>(initialMessages.length >= INITIAL_LIMIT)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)

  // Step 6: Now create memoized version for effects
  // Note: normalizeMessage already uses currentUserId from closure, so we include it in deps
  const normalizeAndInfer = useCallback((m: any): Message => {
    const msg: any = {...m, sender: { ...m.sender, image: m.sender?.image ?? null }, }

    try {
      const seenBy: string[] = Array.isArray(msg.seenBy) ? msg.seenBy : []
      if (currentUserId && msg.senderId === currentUserId) {
        const createdAt = msg.createdAt ? new Date(msg.createdAt).getTime() : 0
        const ageMs = Date.now() - createdAt
        const OTHER_READ_AGE_THRESHOLD = 3000
        const otherSaw = seenBy.some((id) => id && id !== currentUserId)
        if (otherSaw && ageMs > OTHER_READ_AGE_THRESHOLD) msg.status = "read"
      }
    } catch (e) {
      // ignore
    }
    return msg as Message
  }, [currentUserId])

  // ============================================
  // ALL EFFECTS (after all hooks and state)
  // ============================================

  // Effect 1: Scroll handling
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50
      setIsAtBottom(nearBottom)

      setIsScrolling(true)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 1000)
    }

    container.addEventListener("scroll", handleScroll)

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Effect 2: Join/leave channel when connected
  useEffect(() => {
    if (isConnected && channelId) {
      joinChannel(channelId)
      return () => leaveChannel(channelId)
    }
  }, [isConnected, channelId, joinChannel, leaveChannel])

  // Effect 3: Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length === 0) {
      prevLastMessageIdRef.current = null
      return
    }

    const last = messages[messages.length - 1]
    const prevId = prevLastMessageIdRef.current

    if (last.id === prevId) return

    if (last.senderId === currentUserId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      setIsAtBottom(true)
    } else if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    prevLastMessageIdRef.current = last.id
  }, [messages, currentUserId, isAtBottom])

  // Effect 4: Handle real-time message events
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail

      // Skip socket broadcasts for own messages (they don't have clientId)
      // Own messages are handled via optimistic update + server response (which has clientId)
      if (!newMessage?.clientId && newMessage.senderId === currentUserId) {
        return;
      }

      const belongsToConversation =
        (channelId && newMessage.channelId === channelId) ||
        (receiverId &&
          ((newMessage.senderId === receiverId && newMessage.receiverId === currentUserId) ||
            (newMessage.senderId === currentUserId && newMessage.receiverId === receiverId)))

      if (belongsToConversation) {
        setMessages((prev) => {
          // If server echoed back clientId for an optimistic message, replace it
          const clientId = newMessage?.clientId
          if (clientId) {
            const idx = prev.findIndex((m) => m.id === clientId)
            if (idx !== -1) {
              const next = [...prev]
              // Preserve optimistic status (e.g., 'sending') unless server explicitly provided status.
              const existing = next[idx]
              const normalized = normalizeAndInfer(newMessage) as any
              if (!normalized.status && (existing as any)?.status) (normalized as any).status = (existing as any).status
              next[idx] = normalized
              return next
            }
          }

          // avoid duplicates by canonical id
          if (prev.some((msg) => msg.id === newMessage.id)) return prev

          return [...prev, normalizeAndInfer(newMessage)]
        })

        // Electron notification for incoming messages (not from current user)
        try {
          const isIncoming = newMessage.senderId !== currentUserId
          const title = newMessage?.sender?.name || "New message"
          const body = newMessage?.content || (newMessage.fileUrls?.length ? "Sent an attachment" : "")
          if (isIncoming && (window as any)?.electronAPI?.notify) {
            (window as any).electronAPI.notify(title, body)
          }
        } catch {}
      }
    }

    const handleEditedMessage = (event: CustomEvent) => {
      const { messageId, content } = event.detail
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, content } : msg)))
    }

    const handleDeletedMessage = (event: CustomEvent) => {
      const { messageId } = event.detail
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    }


    window.addEventListener("message:received", handleNewMessage as EventListener)
    window.addEventListener("message:edited", handleEditedMessage as EventListener)
    window.addEventListener("message:deleted", handleDeletedMessage as EventListener)

    const handleStatusUpdate = (e: CustomEvent) => {
      const { messageId, status } = e.detail || {}
      if (!messageId) return
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)))
    }

    const handleMessagesRead = (e: CustomEvent) => {
      const { messageIds, readerId } = e.detail || {}
      if (!Array.isArray(messageIds)) return
      setMessages((prev) => prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: "read" } : m)))
    }

    window.addEventListener("message:status-update", handleStatusUpdate as EventListener)
    window.addEventListener("messages:read", handleMessagesRead as EventListener)

    return () => {
      window.removeEventListener("message:received", handleNewMessage as EventListener)
      window.removeEventListener("message:edited", handleEditedMessage as EventListener)
      window.removeEventListener("message:deleted", handleDeletedMessage as EventListener)
      window.removeEventListener("message:status-update", handleStatusUpdate as EventListener)
      window.removeEventListener("messages:read", handleMessagesRead as EventListener)
    }
  }, [channelId, receiverId, currentUserId])

  useEffect(() => {
    const handleReactionUpdate = (
      event: CustomEvent<{ messageId: string; reactions: { emoji: string; userId: string; userName?: string }[] }>
    ) => {
      const detail = event.detail
      console.log("📨 RealTimeMessages received reaction update:", detail);
      if (!detail?.messageId || !Array.isArray(detail.reactions)) return

      setMessages((prev) => {
        let didChange = false
        const next = prev.map((message) => {
          if (message.id !== detail.messageId) return message
          didChange = true
          return { ...message, reactions: detail.reactions }
        })
        console.log("📨 Updated messages:", didChange ? "YES" : "NO");
        return didChange ? next : prev
      })
    }

    window.addEventListener("message:reaction-update", handleReactionUpdate as EventListener)
    return () => {
      window.removeEventListener("message:reaction-update", handleReactionUpdate as EventListener)
    }
  }, [])

  // ============================================
  // CALLBACK FUNCTIONS (after all hooks/effects)
  // ============================================

  // Generic fetcher used for initial refresh and for loading more
  const fetchMessages = useCallback(
    async ({ before, limit }: { before?: string; limit?: number } = {}) => {
      if (isLoading) return null
      setIsLoading(true)
      try {
        let url = "/api/messages"
        if (channelId) {
          url = `/api/channels/${channelId}/messages`
        } else if (receiverId) {
          url = `/api/messages/direct?userId=${receiverId}`
        }

        const qp = new URLSearchParams()
        if (limit) qp.set("limit", String(limit))
        if (before) qp.set("before", String(before))
        const qpString = qp.toString()
        if (qpString) {
          url += url.includes("?") ? `&${qpString}` : `?${qpString}`
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error("Failed to fetch messages")
        const data = await response.json()

        let fetched: Message[] = Array.isArray(data) ? data : data.messages ?? []
        fetched = fetched
          .map((m) => normalizeAndInfer(m))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        setLastRefresh(Date.now())
        return fetched
      } catch (error) {
        console.error("Error fetching messages:", error)
        toast.error("Failed to refresh messages")
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [channelId, receiverId, isLoading, normalizeAndInfer]
  )

  // Merge-based refresh so new optimistic messages are not lost.
  const refreshMessages = useCallback(async () => {
    const fetched = await fetchMessages({ limit: INITIAL_LIMIT })
    if (!fetched) return
    setMessages(prev => {
      const map = new Map<string, Message>()
      for (const m of prev) map.set(m.id, m)
      for (const m of fetched) map.set(m.id, m) // fetched wins for existing ids
      // Sort chronologically
      return Array.from(map.values()).sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })
  }, [fetchMessages, INITIAL_LIMIT])

  // Effect 5: Initial load on mount when channel/receiver changes
  useEffect(() => {
    let isMounted = true

    // If server provided initialMessages, avoid immediate overwrite.
    const shouldFetchOnMount = !initialMessages || initialMessages.length === 0

    const loadInitialMessages = async () => {
      if (!shouldFetchOnMount) return
      if (isLoading) return

      setIsLoading(true)
      setHasMore(true)

      try {
        let url = "/api/messages"
        if (channelId) {
          url = `/api/channels/${channelId}/messages`
        } else if (receiverId) {
          url = `/api/messages/direct?userId=${receiverId}`
        }

        const qp = new URLSearchParams()
        qp.set("limit", String(INITIAL_LIMIT))
        const qpString = qp.toString()
        if (qpString) {
          url += url.includes("?") ? `&${qpString}` : `?${qpString}`
        }

        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) throw new Error("Failed to fetch messages")
        const data = await response.json()

        let fetched: Message[] = Array.isArray(data) ? data : data.messages ?? []
        fetched = fetched
          .map((m) => normalizeAndInfer(m))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        if (isMounted) {
          setMessages(fetched)
          setHasMore(fetched.length >= INITIAL_LIMIT)
          setLastRefresh(Date.now())
        }
      } catch (error) {
        console.error("Error loading initial messages:", error)
        if (isMounted) {
          toast.error("Failed to load messages")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadInitialMessages()

    return () => {
      isMounted = false
    }
  }, [channelId, receiverId, INITIAL_LIMIT, normalizeAndInfer, initialMessages, isLoading])

  // Effect 5b: Refresh when window regains focus or comes online
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && isConnected) {
        // Merge refresh to ensure consistency after navigation or tab switch
        refreshMessages()
      }
    }

    const onOnline = () => {
      refreshMessages()
    }

    window.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("online", onOnline)

    return () => {
      window.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("online", onOnline)
    }
  }, [refreshMessages, isConnected])

  // Effect 6: Periodic refresh (only when disconnected for backup)
  useEffect(() => {
    if (isConnected) return // Don't poll when connected - rely on socket events
    if (!connectionAttempted) return
    
    const interval = setInterval(() => {
      if (!isScrolling && isAtBottom) {
        refreshMessages()
      }
    }, 10000) // 10s interval when disconnected
    return () => clearInterval(interval)
  }, [isConnected, connectionAttempted, isScrolling, isAtBottom, refreshMessages])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    const container = scrollContainerRef.current
    if (!container) return

    setLoadingMore(true)
    // preserve scroll position
    const previousScrollHeight = container.scrollHeight
    const previousScrollTop = container.scrollTop

    const oldest = messages[0]
    const before = oldest?.createdAt

    try {
      const fetched = await fetchMessages({ before, limit: LOAD_MORE_LIMIT })
      if (!fetched) {
        toast.error("No older messages returned")
        return
      }

      // dedupe
      const existingIds = new Set(messages.map((m) => m.id))
      const toPrepend = fetched.filter((m) => !existingIds.has(m.id))

      setMessages((prev) => [...toPrepend, ...prev])

      // adjust hasMore: if we got fewer than requested, assume no more
      if (fetched.length < LOAD_MORE_LIMIT) setHasMore(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load older messages")
    } finally {
      // restore scroll to keep viewport stable
      setTimeout(() => {
        try {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop
        } catch (e) {
          // ignore
        }
      }, 0)
      setLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      {connectionAttempted && (
        <div
          className={`flex justify-between items-center p-2 text-sm ${
            isConnected
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-700"
              : "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Real-time updates active</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Offline mode - Last updated: {new Date(lastRefresh).toLocaleTimeString()}</span>
              </>
            )}
          </div>
          {!isConnected && (
            <Button variant="outline" size="sm" onClick={refreshMessages} disabled={isLoading} className="h-7 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Load More button appears at the top when there are older messages */}
        {hasMore && (
          <div className="flex justify-center py-2 dark:bg-gray-900">
            <Button size="sm" variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="dark:bg-gray-700">
              {loadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}

        <MessageList messages={messages} currentUserId={currentUserId} onlineUsers={onlineUsers} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

