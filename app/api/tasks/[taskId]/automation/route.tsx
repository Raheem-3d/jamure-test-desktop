
// app/api/tasks/[taskId]/automation/route.ts
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const user: any = (session as any)?.user || {}
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = params.taskId;

  try {
    const {
      name,
      trigger,
      conditions,
      actions,
      enabled = true,
      applyToAll = true,
      stopOnFirst = true,
    } = await request.json();

    if (!name || !trigger || !conditions || !actions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

 

    const newRule = await db.automationRule.create({
  data: {
    stopOnFirst,
    name,
    trigger,
    conditions,
    actions,
    enabled,
    applyToAll,
    user: { connect: { id: user.id } },
    
    projectId: taskId, 
  
  }
});


    return NextResponse.json({ rule: newRule }, { status: 201 });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to create automation rule" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const user: any = (session as any)?.user || {}
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = params.taskId;

  try {
    const rules = await db.automationRule.findMany({
      where: {
  userId: user.id,
        OR: [{ projectId: taskId }
          , { applyToAll: true }
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules }, { status: 200 });
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rules" },
      { status: 500 }
    );
  }
}
