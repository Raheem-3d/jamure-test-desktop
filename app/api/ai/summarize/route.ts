// API Route: Message Summarization
// Usage: POST /api/ai/summarize
// Body: { messageIds: string[] } or { channelId: string, limit: number }

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
    const { messageIds, channelId, limit = 50 } = body;

    let messages;

    if (messageIds && Array.isArray(messageIds)) {
      // Summarize specific messages
      messages = await db.message.findMany({
        where: { id: { in: messageIds } },
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      });
    } else if (channelId) {
      // Summarize channel messages
      messages = await db.message.findMany({
        where: { channelId },
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      messages.reverse(); // oldest first
    } else {
      return NextResponse.json(
        { error: 'Provide messageIds or channelId' },
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json({ summary: 'No messages to summarize' });
    }

    // Format messages for AI
    const conversationText = messages
      .map((m: any) => `${m.sender.name}: ${m.content}`)
      .join('\n');

    // Get AI summary
    const perplexity = getPerplexityClient();
    const summary = await perplexity.summarize(conversationText);

    return NextResponse.json({
      success: true,
      summary,
      messageCount: messages.length,
    });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to summarize messages' },
      { status: 500 }
    );
  }
}
