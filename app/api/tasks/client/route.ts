// /pages/api/tasks/recent.ts
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user: any = (session as any).user || {}
    const orgId = user.organizationId

    const recentTasks = await db.task.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        OR: [
          { creatorId: user.id },
          {
            assignments: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 3,
      include: {
        creator: true,
        assignments: {
          include: {
            user: true,
          },
        },
        channel: true,
      },
    });

   

   return  NextResponse.json({ recentTasks: recentTasks });
  } catch (error) {
    console.error("Error fetching recent tasks:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
