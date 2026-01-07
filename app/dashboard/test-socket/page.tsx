"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestSocketPage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [testResults, setTestResults] = useState<any[]>([])

  useEffect(() => {
    const initSocket = async () => {
      try {
        // Initialize Socket.io server
        await fetch("/api/socketio")

        // Create client connection
        const socketInstance = io({
          path: "/api/socketio",
          addTrailingSlash: false,
          transports: ["polling", "websocket"],
        })

        socketInstance.on("connect", () => {
          console.log("✅ Connected to Socket.io:", socketInstance.id)
          setIsConnected(true)
          setSocket(socketInstance)
          addMessage("✅ Connected to Socket.io server")
        })

        socketInstance.on("connect_error", (error) => {
          console.error("❌ Connection error:", error)
          addMessage("❌ Connection error: " + error.message)
        })

        socketInstance.on("disconnect", () => {
          console.log("❌ Disconnected from Socket.io")
          setIsConnected(false)
          addMessage("❌ Disconnected from Socket.io")
        })

        socketInstance.on("test-message", (data) => {
          console.log("📨 Received test message:", data)
          addMessage("📨 Received: " + data.message)
        })

        socketInstance.on("test-server-response", (data) => {
          console.log("📨 Server response:", data)
          addMessage("📨 Server response: " + data.message)
        })

        socketInstance.on("user-online", (data) => {
          console.log("👤 User online:", data)
          addMessage("👤 User online: " + data.userId)
        })

        return socketInstance
      } catch (error) {
        console.error("❌ Failed to initialize Socket.io:", error)
        addMessage("❌ Failed to initialize: " + error.message)
      }
    }

    initSocket()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  const addMessage = (message: string) => {
    setMessages((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testServerEmit = async () => {
    try {
      const response = await fetch("/api/test-socket")
      const result = await response.json()
      setTestResults((prev) => [...prev, result])
      addMessage("🧪 Server test result: " + result.message)
    } catch (error) {
      addMessage("❌ Server test failed: " + error.message)
    }
  }

  const testClientEmit = () => {
    if (socket && isConnected) {
      socket.emit("test-client-message", {
        message: "Hello from client",
        timestamp: new Date().toISOString(),
      })
      addMessage("📤 Sent test message to server")
    } else {
      addMessage("❌ Socket not connected")
    }
  }

  const joinAsUser = () => {
    if (socket && isConnected) {
      socket.emit("user-join", "test-user-123")
      addMessage("👤 Joined as test user")
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Socket.io Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>

          <div className="space-x-2">
            <Button onClick={testServerEmit}>Test Server Emit</Button>
            <Button onClick={testClientEmit} disabled={!isConnected}>
              Test Client Emit
            </Button>
            <Button onClick={joinAsUser} disabled={!isConnected}>
              Join as User
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                {message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(testResults, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
