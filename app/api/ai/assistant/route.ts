// API Route: AI Project Assistant (Advanced)
// Usage: POST /api/ai/assistant
// Body: { query: string, context?: { projectId?: string, organizationId?: string } }

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
    const { query, context = {} } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const organizationId = session.user.organizationId;

    // Role-based filtering
    const isOrgAdmin = userRole === 'ORG_ADMIN';
    const isOrgMember = userRole === 'ORG_MEMBER';
    const isEmployee = userRole === 'EMPLOYEE';
    const isManager = userRole === 'MANAGER';
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    
    // For ORG_ADMIN, ORG_MEMBER, MANAGER, and SUPER_ADMIN: show organization-wide data
    // For EMPLOYEE: show only their own tasks and related information
    const canViewOrgData = isOrgAdmin || isOrgMember || isManager || isSuperAdmin;

    // Gather project context based on role
    const taskFilter = canViewOrgData 
      ? { organizationId }
      : { 
          organizationId,
          OR: [
            { creatorId: userId },
            { assignments: { some: { userId } } }
          ]
        };

    const tasks = await db.task.findMany({
      where: taskFilter,
      include: {
        creator: { select: { name: true } },
        assignments: { include: { user: { select: { name: true } } } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    // For messages, employees only see their own or messages in channels they're part of
    const messageFilter = canViewOrgData
      ? {
          OR: [
            { channel: { organizationId } },
            { sender: { organizationId } }
          ]
        }
      : {
          OR: [
            { senderId: userId },
            { receiverId: userId },
            { channel: { members: { some: { userId } } } }
          ]
        };

    const messages = await db.message.findMany({
      where: messageFilter,
      include: { sender: { select: { name: true } } },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    // Format context for AI
    const userName = session.user.name || 'User';
    
    const tasksText = tasks
      .map(
        (t: any) => {
          const assigneeNames = t.assignments.map((a: any) => a.user.name).join(', ') || 'Unassigned';
          const isAssignedToUser = t.assignments.some((a: any) => a.userId === userId);
          const isCreatedByUser = t.creatorId === userId;
          
          if (isEmployee) {
            // For employees, make it clear which tasks are theirs
            return `- ${t.title} (${t.status})${isAssignedToUser ? ' [Assigned to you]' : isCreatedByUser ? ' [Created by you]' : ''}`;
          } else {
            // For admins/managers, show full assignment details
            return `- ${t.title} (${t.status}) - Assigned: ${assigneeNames}`;
          }
        }
      )
      .join('\n');

    const messagesText = messages
      .slice(0, 20)
      .map((m: any) => `${m.sender.name}: ${m.content}`)
      .join('\n');

    const roleContext = canViewOrgData 
      ? 'You have access to organization-wide data including all tasks and team discussions.'
      : `You have access only to tasks you created or are assigned to. The user's name is "${userName}".`;

    const contextText = `
User Name: ${userName}
User Role: ${userRole}
${roleContext}

Project Overview:
- Total Tasks (visible to you): ${tasks.length}
- Recent Tasks:\n${tasksText}

Recent Team Discussions:\n${messagesText}
`;

    // Get AI response
    const perplexity = getPerplexityClient();
    
    const systemPrompt = canViewOrgData
      ? `You are an intelligent project management assistant. Help users with insights about their organization, projects, tasks, team performance, and provide actionable recommendations. You have access to organization-wide data.

Guidelines:
- Provide clear, concise answers
- Use bullet points for lists
- Focus on actionable insights
- Be professional but friendly`
      : `You are an intelligent project management assistant. Help this employee with insights about their own tasks, assignments, and personal productivity. You only have access to tasks they created or are assigned to. Do not provide organization-wide analytics or team-wide insights.

Guidelines:
- Be concise and direct - answer what they asked
- Only show tasks assigned to or created by them
- Don't mention tasks assigned to others
- Use simple bullet points
- Focus on their personal productivity
- Skip unnecessary explanations or context
- Format: Just list their active tasks if asked about current tasks`;

    const response = await perplexity.chat([
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nUser Question: ${query}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      response,
      query,
    });
  } catch (error: any) {
    console.error('AI Assistant API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}
