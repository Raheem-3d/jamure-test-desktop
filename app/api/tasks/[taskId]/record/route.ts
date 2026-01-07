
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;

  try {
    const session = await getServerSession(authOptions);
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color, type, assignedTeam, order } = await request.json();

    const newStage = await db.stage.create({
      data: {
        name,
        taskId,
        color,
        assignedTeam,
        order,
      },
    });

    // Log activity
    await db.taskActivity.create({
      data: {
        taskId,
        userId: user.id,
        type: "stage_created",
        description: `Stage "${newStage.name}" was created.`,
      },
    });

    return NextResponse.json({ stage: newStage }, { status: 201 });
  } catch (error) {
    console.error("Error creating stage:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [stages, activities] = await Promise.all([
      db.stage.findMany({ where: { taskId } }),
      db.taskActivity.findMany({
        where: { taskId },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
      }),
    ]);

    return NextResponse.json({ stages, activities });
  } catch (error) {
    console.error("GET task error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get("id");

  try {
    const session = await getServerSession(authOptions);
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stageId) {
      return NextResponse.json(
        { error: "Stage ID is required" },
        { status: 400 }
      );
    }

    const { name, color, assignedTeam, order } = await request.json();

    const updatedStage = await db.stage.update({
      where: {
        id: stageId,
        taskId: taskId,
      },
      data: {
        name,
        color,
        assignedTeam,
        order,
      },
    });

    // Log activity
    await db.taskActivity.create({
      data: {
        taskId,
        userId: user.id,
        type: "stage_updated",
        description: `Stage "${updatedStage.name}" was updated.`,
      },
    });

    return NextResponse.json({ stage: updatedStage });
  } catch (error) {
    console.error("Error updating stage:", error);
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get("id");

  try {
    const session = await getServerSession(authOptions);
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stageId) {
      return NextResponse.json(
        { error: "Stage ID is required" },
        { status: 400 }
      );
    }

    // First get the stage to log its name before deletion
    const stageToDelete = await db.stage.findUnique({
      where: {
        id: stageId,
        taskId: taskId,
      },
    });

    if (!stageToDelete) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 }
      );
    }

    // Delete the stage
    const deletedStage = await db.stage.delete({
      where: {
        id: stageId,
      },
    });

    // Log activity
    await db.taskActivity.create({
      data: {
        taskId,
        userId: user.id,
        type: "stage_deleted",
        description: `Stage "${stageToDelete.name}" was deleted.`,
      },
    });

    return NextResponse.json({
      message: "Stage deleted successfully",
      stage: deletedStage,
    });
  } catch (error) {
    console.error("Error deleting stage:", error);
    return NextResponse.json(
      { error: "Failed to delete stage" },
      { status: 500 }
    );
  }
}