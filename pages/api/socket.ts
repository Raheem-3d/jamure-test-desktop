import type { NextApiRequest, NextApiResponse } from "next"
import { initializeSocketIO } from "@/lib/socket-server"
import type { Server as NetServer } from "http"
import { initializeReminderSystem } from "@/lib/reminder-init"

type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: any
    }
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  if (res.socket.server.io) {
    console.log("Socket.io server already running")
    initializeReminderSystem()
    res.end()
    return
  }

  console.log("Starting Socket.io server...")

  try {
    const io = initializeSocketIO(res.socket.server)
    res.socket.server.io = io

    console.log("✅ Socket.io server started successfully")
    res.end()
  } catch (error) {
    console.error("❌ Failed to start Socket.io server:", error)
    res.status(500).json({ error: "Failed to start Socket.io server" })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
