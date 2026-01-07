import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile } from "fs/promises"
import { existsSync } from "fs"

export async function GET(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find message with file
    const message = await db.message.findUnique({
      where: { id: params.messageId },
      include: {
        file: true,
      },
    })

    if (!message || !message.file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Only allow preview for images
    if (!message.file.fileType.startsWith("image/")) {
      return NextResponse.json({ error: "Preview not available" }, { status: 400 })
    }

    // Check if file exists on disk
    if (!existsSync(message.file.filePath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    // Read file from disk
    const fileBuffer = await readFile(message.file.filePath)

    // Return image for preview
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": message.file.fileType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("File preview error:", error)
    return NextResponse.json({ error: "Preview failed" }, { status: 500 })
  }
}
