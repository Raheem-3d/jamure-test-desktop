import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PerplexityClient } from "@/lib/perplexity-client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if API key exists
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error("PERPLEXITY_API_KEY not found in environment variables")
      return NextResponse.json(
        { error: "AI service not configured. Please add PERPLEXITY_API_KEY to your environment variables." },
        { status: 500 }
      )
    }

    const perplexityClient = new PerplexityClient()

    const { title, type } = await req.json()

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Project title is required" },
        { status: 400 }
      )
    }

    // Type can be 'project', 'task', 'channel', etc.
    const itemType = type || "project"

    const prompt = `Generate a clear, professional description for a ${itemType} titled: "${title}"

Requirements:
- 2-3 sentences maximum
- Focus on purpose and key objectives
- Professional tone
- Actionable and specific
- No filler words

Provide ONLY the description without any prefixes, explanations, or additional text.`

    const response = await perplexityClient.chat([
      {
        role: "system",
        content: "You are a professional project management assistant. Generate concise, clear descriptions for projects, tasks, and initiatives. Return ONLY the description, nothing else."
      },
      {
        role: "user",
        content: prompt
      }
    ])

    // Clean up the response
    let description = response.trim()
    if (description.startsWith('"') && description.endsWith('"')) {
      description = description.slice(1, -1)
    }

    return NextResponse.json({
      title,
      description,
      type: itemType
    })
  } catch (error: any) {
    console.error("Error generating description:", error)
    
    // Provide more specific error messages
    const errorMessage = error?.message?.includes("API key") 
      ? "AI service authentication failed. Please check your API key."
      : error?.message?.includes("fetch")
      ? "Network error. Please check your internet connection."
      : "Failed to generate description. Please try again."
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
