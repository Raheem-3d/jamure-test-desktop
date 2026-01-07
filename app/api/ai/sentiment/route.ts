// API Route: Sentiment Analysis
// Usage: POST /api/ai/sentiment
// Body: { channelId?: string, userId?: string, period?: 'day' | 'week' | 'month' }

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
    const { channelId, userId, period = 'week' } = body;

    // Calculate time range
    const now = new Date();
    const periodMap = {
      day: 1,
      week: 7,
      month: 30,
    };
    const daysAgo = periodMap[period as keyof typeof periodMap] || 7;
    const since = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Fetch messages
    const where: any = { createdAt: { gte: since } };
    if (channelId) where.channelId = channelId;
    if (userId) where.senderId = userId;

    const messages = await db.message.findMany({
      where,
      select: { content: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        sentiment: { overall: 'neutral', score: 0, summary: 'No messages found' },
        messageCount: 0,
      });
    }

    // Analyze sentiment
    const perplexity = getPerplexityClient();
    const messageContents = messages.map((m: any) => m.content);
    const sentiment = await perplexity.analyzeSentiment(messageContents);

    return NextResponse.json({
      success: true,
      sentiment,
      messageCount: messages.length,
      period,
    });
  } catch (error: any) {
    console.error('Sentiment API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}
