import type { NextApiRequest } from "next"
import type { NextApiResponseServerIO } from "@/types/next"
import { Server as ServerIO } from "socket.io"
import type { Server as NetServer } from "http"

export const config = {
  api: {
    bodyParser: false,
  },
}

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("*First use, starting socket.io")

    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    // Store Socket.io instance globally
    ;(global as any).httpServer = httpServer
    ;(httpServer as any).io = io

    // Store online users
    const onlineUsers = new Map<string, string>() // userId -> socketId

    io.on("connection", (socket) => {
      // console.log("Socket connected:", socket.id)

      // User comes online
      socket.on("user-online", (userId: string) => {
        console.log(`User ${userId} is online`)
        onlineUsers.set(userId, socket.id)
        socket.join(`user-${userId}`)

        // Broadcast online users
        io.emit("users-online", Array.from(onlineUsers.keys()))
      })

      // User goes offline
      socket.on("user-offline", (userId: string) => {
        console.log(`User ${userId} is offline`)
        onlineUsers.delete(userId)
        socket.leave(`user-${userId}`)

        // Broadcast online users
        io.emit("users-online", Array.from(onlineUsers.keys()))
      })

      // Join channel
      socket.on("join-channel", (channelId: string) => {
        socket.join(`channel-${channelId}`)
        console.log(`Socket joined channel: ${channelId}`)
      })

      // Leave channel
      socket.on("leave-channel", (channelId: string) => {
        socket.leave(`channel-${channelId}`)
        console.log(`Socket left channel: ${channelId}`)
      })

      // New message (from client)
      socket.on("new-message", (message: any) => {
        console.log("Broadcasting new message:", message.id)

        if (message.channelId) {
          // Broadcast to channel
          socket.to(`channel-${message.channelId}`).emit("message-received", message)
        } else if (message.receiverId) {
          // Broadcast to direct message recipient
          socket.to(`user-${message.receiverId}`).emit("message-received", message)
        }
      })

    // Message updated (from server)
      socket.on("message-updated", (data: any) => {
        console.log("Broadcasting message update:", data)
        if (data.channelId) {
          socket.to(`channel-${data.channelId}`).emit("message_updated", data)
        } else if (data.conversationId) {
          socket.to(`conversation-${data.conversationId}`).emit("message_updated", data)
        }
      })

      // Message deleted (from server)
      socket.on("message-deleted", (data: any) => {
        console.log("Broadcasting message deletion:", data)
        if (data.channelId) {
          socket.to(`channel-${data.channelId}`).emit("message_deleted", data)
        } else if (data.conversationId) {
          socket.to(`conversation-${data.conversationId}`).emit("message_deleted", data)
        }
      })

      // New notification (from client)
      socket.on("new-notification", (notification: any) => {
        console.log("Broadcasting notification:", notification.id)
        socket.to(`user-${notification.userId}`).emit("notification-received", notification)
      })

      // Typing indicators
      socket.on("typing-start", ({ userId, channelId }: { userId: string; channelId: string }) => {
        socket.to(`channel-${channelId}`).emit("user-typing", { userId, isTyping: true })
      })

      socket.on("typing-stop", ({ userId, channelId }: { userId: string; channelId: string }) => {
        socket.to(`channel-${channelId}`).emit("user-typing", { userId, isTyping: false })
      })

      // Handle disconnect
      socket.on("disconnect", () => {
        // console.log("Socket disconnected:", socket.id)

        // Find and remove user from online list
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(userId)
            io.emit("users-online", Array.from(onlineUsers.keys()))
            break
          }
        }
      })
    })

    res.socket.server.io = io
  } else {
    console.log("socket.io already running")
  }
  res.end()
}

export default ioHandler

