import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if Socket.io is available
    const io = (global as any).io

    if (io) {
      // Test emit to all connected clients
      io.emit("test-message", {
        message: "Test message from server",
        timestamp: new Date().toISOString(),
      })

      console.log("✅ Test message emitted via Socket.io")
      return NextResponse.json({
        success: true,
        message: "Test message sent via Socket.io",
        connectedClients: io.engine.clientsCount,
      })
    } else {
      console.log("❌ Socket.io not available")
      return NextResponse.json({
        success: false,
        message: "Socket.io not available",
      })
    }
  } catch (error) {
    console.error("❌ Error testing Socket.io:", error)
    return NextResponse.json({
      success: false,
      message: "Error testing Socket.io",
      error: error.message,
    })
  }
}
