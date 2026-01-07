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

    // Check if file exists on disk
    if (!existsSync(message.file.filePath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    // Read file from disk using stored path
    const fileBuffer = await readFile(message.file.filePath)

    console.log("📥 File downloaded:", message.file.originalName)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": message.file.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${message.file.originalName}"`,
        "Content-Length": message.file.fileSize.toString(),
        "Cache-Control": "private, max-age=0",
      },
    })
  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
