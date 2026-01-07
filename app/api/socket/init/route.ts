import { NextResponse } from "next/server"
import { getSocketIO } from "@/lib/socket-server"

export async function GET() {
  try {
    // Try to get the Socket.io instance
    const io = getSocketIO()

    if (io) {
      return NextResponse.json({
        status: "connected",
        message: "Socket.io server is running",
      })
    } else {
      // Try to initialize by calling the socket endpoint
      const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/socket`)

      if (response.ok) {
        return NextResponse.json({
          status: "initialized",
          message: "Socket.io server initialized",
        })
      } else {
        return NextResponse.json(
          {
            status: "error",
            message: "Failed to initialize Socket.io server",
          },
          { status: 500 },
        )
      }
    }
  } catch (error) {
    console.error("Socket.io initialization error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Socket.io server error",
      },
      { status: 500 },
    )
  }
}
