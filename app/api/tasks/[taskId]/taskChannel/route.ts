// File: /app/api/channels/by-task/[taskId]/route.ts

import { NextResponse } from "next/server"
import { db } from "@/lib/db" // adjust path to your prisma/db instance
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  const { taskId } = params

  try {
   
 const session = await getServerSession(authOptions);
    const recentChannelsForClient = await db.channel.findMany({
     where: {
  AND: [
    {
      OR: [
        {
          name: {
            contains: "Client",
            // mode: "insensitive",
          },
        },
        {
          name: {
            contains: "Admin",
            // mode: "insensitive",
          },
        },
      ],
    },
    {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  ],
},
  orderBy: {
    updatedAt: "desc",
  },
  take: 5,
  include: {
    department: true,
    _count: {
      select: { messages: true },
    },
  },
});

    return NextResponse.json({ recentChannelsForClient })
  } catch (error) {
    console.error("Error fetching channel by taskId:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
