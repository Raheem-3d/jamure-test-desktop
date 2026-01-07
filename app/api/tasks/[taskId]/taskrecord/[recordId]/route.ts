import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: { taskId: string; recordId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, recordId } = params;

    // Verify record exists and belongs to the parent task
    const record = await db.record.findUnique({
      where: { id: recordId },
      select: { id: true, parentTaskId: true, title: true },
    });

    if (!record || record.parentTaskId !== taskId) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await db.record.delete({ where: { id: recordId } });

    // Log activity for the parent task
    await db.taskActivity.create({
      data: {
        taskId,
        userId: (session.user as any).id,
        type: "record_deleted",
        description: `Record "${record.title}" was deleted.`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}
