// API Route: AI Task Breakdown
// Usage: POST /api/ai/task-breakdown
// Body: { taskId: string } or { title: string, description: string }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPerplexityClient } from '@/lib/perplexity-client';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, title, description } = body;

    let taskTitle: string;
    let taskDescription: string;

    if (taskId) {
      const task = await db.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      taskTitle = task.title;
      taskDescription = task.description || '';
    } else if (title) {
      taskTitle = title;
      taskDescription = description || '';
    } else {
      return NextResponse.json(
        { error: 'Provide taskId or title' },
        { status: 400 }
      );
    }

    // Get AI breakdown
    const perplexity = getPerplexityClient();
    const subtasks = await perplexity.breakdownTask(taskTitle, taskDescription);

    return NextResponse.json({
      success: true,
      subtasks,
      originalTask: { title: taskTitle, description: taskDescription },
    });
  } catch (error: any) {
    console.error('Task Breakdown API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to breakdown task' },
      { status: 500 }
    );
  }
}
