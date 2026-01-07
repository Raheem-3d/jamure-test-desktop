import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: any }) {

  // `params` can be a thenable in some Next.js runtimes — await it before use
  const resolvedParams = await params;
  const channelId = resolvedParams?.channelId;
  
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(request as any)
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 })
    }
    // Debug: log authenticated user and organizationId to diagnose filtering
    try {
      console.log('[route] Authenticated user:', { id: user.id, organizationId: user.organizationId, isSuperAdmin: user.isSuperAdmin });
    } catch (e) {
      console.warn('[route] Failed to log user info', e);
    }
    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get("limit")
    const beforeParam = searchParams.get("before")
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 0)) : undefined

    const where: any = { channelId }
    
    // Only add organizationId filter if user has one
    // if (user?.organizationId) {
    //   where.organizationId = user.organizationId
    // }
    
    if (beforeParam) {
      const beforeDate = new Date(beforeParam)
      if (!isNaN(beforeDate.getTime())) where.createdAt = { lt: beforeDate }
    }

 

    // Get channel messages newest-first; client will normalize order
    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ?? undefined,
      include: {
        sender: { select: { id: true, name: true, email: true, image: true } },
        receiver: { select: { id: true, name: true, email: true, image: true } },
        pinnedMessage: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    
    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching channel messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
