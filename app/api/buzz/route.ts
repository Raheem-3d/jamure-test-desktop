// app/api/buzz/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // <- apne project ke hisaab se
import { emitToChannel, emitToUser, getSocketIO } from "@/lib/socket-server";
import { db } from "@/lib/db";

const BUZZ_LIMIT = 3;          // 3 per minute
const WINDOW_MS = 60_000;
const buzzCounter: Map<string, { count: number; resetAt: number }> = new Map();

function canBuzz(userId: string) {
  const now = Date.now();
  const cur = buzzCounter.get(userId);
  if (!cur || now > cur.resetAt) {
    buzzCounter.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (cur.count < BUZZ_LIMIT) {
    cur.count += 1;
    return true;
  }
  return false;
}





export async function getChannelMemberIds(channelId: string): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { members: { select: { userId: true } } }, // only what you need
  });

  if (!channel) return [];
  return channel.members.map(m => m.userId);
}

export async function POST(req: Request) {
  try {
    // make sure socket server is up 
    const io = getSocketIO();
    if (!io) {
      return NextResponse.json({ error: "Socket server not ready" }, { status: 503 });
    }

    const session = await getServerSession(authOptions as any);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, receiverId, message } = await req.json();

    if (!channelId && !receiverId) {
      return NextResponse.json({ error: "channelId or receiverId required" }, { status: 400 });
    }

    // rate limit
    if (!canBuzz(userId)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const payload = {
      channelId: channelId as string | undefined,
      fromUserId: userId,
      message: typeof message === "string" && message.trim() ? message : "Buzz!",
    };

    if (receiverId) {
      if (receiverId !== userId) {
        emitToUser(receiverId, "buzz", payload);
      }
      return NextResponse.json({ ok: true });
    }

    // channel path
    const memberIds = await getChannelMemberIds(channelId);
    const targets = memberIds.filter((u) => u && u !== userId);

    if (targets.length > 0) {
      targets.forEach((uid) => emitToUser(uid, "buzz", payload));
    }

    // optional: also emit to channel room (open tabs listening to the room)  
    emitToChannel(channelId, "buzz", payload);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/buzz error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
