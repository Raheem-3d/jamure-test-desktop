

import { Server as ServerIO } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiResponse } from "next";
import {
  addReactionJSON,
  getMessageChannelId,
  getReactions,
  getMessagePeers,
  removeReactionJSON,
} from "./reactions";
import { db } from "./db";

export interface SocketServer extends HTTPServer {
  io?: ServerIO;
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIO;
}

let io: ServerIO | null = null;

// ---------------------
// Helpers / Stubs
// ---------------------
async function getChannelMemberIds(channelId: string): Promise<string[]> {
  try {
    const rows = await db.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    return rows.map((r: { userId: string }) => r.userId).filter(Boolean) as string[];
  } catch (e) {
    console.error("getChannelMemberIds failed for", channelId, e);
    return [];
  }
}

// Simple in-memory rate limiter per sender userId (token bucket-ish)
const BUZZ_LIMIT = 3; // max buzzes per WINDOW_MS
const WINDOW_MS = 60_000; // 1 minute
const buzzCounter = new Map<string, { count: number; resetAt: number }>();
function canBuzz(userId: string) {
  const now = Date.now();
  const entry = buzzCounter.get(userId);
  if (!entry || now > entry.resetAt) {
    buzzCounter.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count < BUZZ_LIMIT) {
    entry.count += 1;
    return true;
  }
  return false;
}

export function initializeSocketIO(server: HTTPServer) {
  if (io) {
    console.log("Socket.io already initialized");
    return io;
  }

  console.log("Initializing Socket.io server...");

  io = new ServerIO(server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
  });

  // online userId -> Set<socketId>
  const onlineUsers = new Map<string, Set<string>>();

  io.on("connect", (socket) => {
    console.log("✅ User connected:", socket.id);

    // --------------
    // USER ONLINE
    // --------------
    // Support both event names used across your code: "user-join" (old) and "user:online" (new)
    const onUserOnline = (userId: string) => {
      if (!userId) return;
      console.log(`👤 User ${userId} joined with socket ${socket.id}`);
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId)!.add(socket.id);
      socket.join(`user-${userId}`);
      socket.data.userId = userId;
      const onlineUserIds = Array.from(onlineUsers.keys());
      io!.emit("users-online", onlineUserIds); // your client listens to this name
    };
    socket.on("user-join", onUserOnline);
    socket.on("user:online", ({ userId }: { userId: string }) => onUserOnline(userId));

    // --------------
    // USER OFFLINE
    // --------------
    socket.on("user-offline", (userId: string) => {
      handleUserDisconnect(userId, socket.id);
    });

    // --------------
    // CHANNEL JOIN/LEAVE
    // --------------
    socket.on("join-channel", (channelId: string) => {
      socket.join(`channel-${channelId}`);
      console.log(`📺 Socket ${socket.id} joined channel: ${channelId}`);
    });

    socket.on("leave-channel", (channelId: string) => {
      socket.leave(`channel-${channelId}`);
      console.log(`📺 Socket ${socket.id} left channel: ${channelId}`);
    });

    // --------------
    // MESSAGE EVENTS (kept as-is to match your current code)
    // --------------
    // socket.on("send-message", (data) => {
    //   console.log("📨 Broadcasting message:", data?.id);
    //   if (data?.channelId) {
    //     socket.to(`channel-${data.channelId}`).emit("new-message", data);
    //   } else if (data?.receiverId) {
    //     socket.to(`user-${data.receiverId}`).emit("new-message", data);
    //   }
    // });

    socket.on("send-message", (data, ack) => {
  try {
    const senderId: string | undefined = socket.data.userId;

    // Acknowledge to sender that server received the message
    ack?.(true);

    // Notify sender that message is saved/received by server => 'sent'
    if (senderId) {
      io!.to(`user-${senderId}`).emit("message:status-updated", {
        messageId: data?.id,
        status: "sent",
      });
    }

    if (data.channelId) {
      // Broadcast to all channel members (including sender for multi-device sync)
      io!.to(`channel-${data.channelId}`).emit("new-message", data);
      // Also emit to sender's personal room for consistency
      if (senderId) {
        io!.to(`user-${senderId}`).emit("new-message", data);
      }
    } else if (data.receiverId) {
      // Emit to receiver's personal room (works for DM)
      io!.to(`user-${data.receiverId}`).emit("new-message", data);

      // If the recipient is currently online (has sockets), consider the message delivered
      const recipientSockets = onlineUsers.get(data.receiverId as string);
      if (recipientSockets && recipientSockets.size > 0 && senderId) {
        io!.to(`user-${senderId}`).emit("message:status-updated", {
          messageId: data?.id,
          status: "delivered",
        });
      }
    }
  } catch (e) {
    console.error("send-message error:", e);
    ack?.(false);
  }
});

    // ---------------------
    // MESSAGE STATUS UPDATES (from clients)
    // ---------------------
    socket.on("message:status-update", async (payload: { messageId: string; status: string }) => {
      try {
        const { messageId, status } = payload || {};
        if (!messageId) return;

        // Find sender of the message so we can notify them
        const msg = await db.message.findUnique({ where: { id: messageId }, select: { senderId: true } });
        const senderId = msg?.senderId;
        if (!senderId) return;

        // Broadcast status update to the message sender
        io!.to(`user-${senderId}`).emit("message:status-updated", { messageId, status });
      } catch (err) {
        console.error("message:status-update handler error", err);
      }
    });

    // ---------------------
    // MARK AS READ (persist and notify senders)
    // payload: { messageIds: string[] }
    // ---------------------
    socket.on("mark-as-read", async (payload: { messageIds: string[] }) => {
      try {
        const readerId: string | undefined = socket.data.userId as any;
        const messageIds = Array.isArray(payload?.messageIds) ? payload.messageIds : [];
        if (!readerId || messageIds.length === 0) return;

        const updatedSenders = new Set<string>();

        for (const mid of messageIds) {
          try {
            const existing = await db.message.findUnique({ where: { id: mid }, select: { seenBy: true, senderId: true } });
            const prev = Array.isArray(existing?.seenBy) ? (existing!.seenBy as string[]) : [];
            if (!prev.includes(readerId)) {
              const next = [...prev, readerId];
              await db.message.update({ where: { id: mid }, data: { seenBy: next as any } });
            }
            if (existing?.senderId) updatedSenders.add(existing.senderId);
          } catch (e) {
            console.error("Failed to mark message read", mid, e);
          }
        }

        // Notify each sender that their messages were read
        for (const s of updatedSenders) {
          io!.to(`user-${s}`).emit("messages:read", { messageIds, readerId });
        }
      } catch (err) {
        console.error("mark-as-read handler error", err);
      }
    });


    socket.on("send-notification", (data) => {
      console.log("🔔 Broadcasting notification to user:", data?.userId);
      if (!data?.userId) return;
      socket.to(`user-${data.userId}`).emit("new-notification", data);
    });

    // --------------
    // MESSAGE DELETION
    // --------------
    socket.on("message:delete", async (payload: { messageId: string }) => {
      try {
        const { messageId } = payload;
        if (!messageId) return;

        console.log("🗑️ Broadcasting message deletion:", messageId);

        // Get the message details to notify relevant users
        const message = await db.message.findUnique({
          where: { id: messageId },
          select: { 
            channelId: true, 
            senderId: true, 
            receiverId: true 
          }
        });

        if (!message) return;

        // Broadcast to channel members or direct message participants
        if (message.channelId) {
          io!.to(`channel-${message.channelId}`).emit("message:deleted", { messageId });
        } else if (message.receiverId) {
          // Direct message - notify both sender and receiver
          io!.to(`user-${message.senderId}`).emit("message:deleted", { messageId });
          io!.to(`user-${message.receiverId}`).emit("message:deleted", { messageId });
        }
      } catch (err) {
        console.error("message:delete handler error", err);
      }
    });

    // --------------
    // TASK MANAGEMENT EVENTS
    // --------------
    socket.on("task:updated", (data) => {
      console.log("📝 Broadcasting task update:", data?.taskId);
      // Broadcast to all connected clients
      io!.emit("task:updated", data);
    });

    socket.on("task:move", (data) => {
      console.log("🔀 Broadcasting task move:", data?.taskId);
      // Broadcast to all connected clients
      io!.emit("task:moved", data);
    });

    socket.on("task:create", (data) => {
      console.log("✨ Broadcasting task creation:", data?.id);
      // Broadcast to all connected clients
      io!.emit("task:created", data);
    });

    // --------------
    // BUZZ FEATURE
    // --------------
    type BuzzAck = (resp: { ok: boolean; reason?: string }) => void;
    socket.on(
      "buzz:send",
      async (
        payload: { channelId?: string; receiverId?: string; message?: string },
        ack?: BuzzAck
      ) => {
        try {
          const senderId: string | undefined = socket.data.userId;
          if (!senderId) return ack?.({ ok: false, reason: "unauthorized" });
          if (!payload?.channelId && !payload?.receiverId)
            return ack?.({ ok: false, reason: "bad_request" });

          // rate limit per sender
          if (!canBuzz(senderId)) return ack?.({ ok: false, reason: "rate_limited" });

          let recipients: string[] = [];
          if (payload.channelId) {
            recipients = await getChannelMemberIds(payload.channelId);
          } else if (payload.receiverId) {
            recipients = [payload.receiverId];
          }

          // Do not buzz the sender themselves
          recipients = recipients.filter((u) => u && u !== senderId);

          if (recipients.length === 0) return ack?.({ ok: true });

              console.log("🚨 buzz:send => recipients:", recipients, "payload:", payload);

          const buzzEvent = {
            channelId: payload.channelId,
            fromUserId: senderId,
            message: payload.message || "Buzz!",
          };

          // Prefer per-user rooms so DM works and channel members get it even if not in channel room
          for (const uid of recipients) {
            io!.to(`user-${uid}`).emit("buzz", buzzEvent);
          }

          // Optionally, also emit to channel room for open channel tabs (harmless duplicate safeguards in client)
          if (payload.channelId) {
            io!.to(`channel-${payload.channelId}`).emit("buzz", buzzEvent);
          }

          ack?.({ ok: true });
        } catch (e) {
          // console.error("buzz:send error", e);
          ack?.({ ok: false, reason: "server_error" });
        }
      }
    );

    // --------------
    // REACTIONS (kept close to your version; fix small issues)
    // --------------
    type Ack<T> = (response: T) => void;

    socket.on(
      "add-reaction",
      async (
        { messageId, emoji, userId, userName }: { messageId: string; emoji: string; userId: string; userName?: string },
        ack: Ack<{ success: boolean; reactions?: any[] }>
      ) => {
        try {
          const updated = await addReactionJSON(messageId, { emoji, userId, userName });
          const channelId = await getMessageChannelId(messageId);

          if (channelId) {
            // Channel message - broadcast to all channel members
            io!.to(`channel-${channelId}`).emit("reaction:update", { messageId, reactions: updated });
          } else {
            // DM message - broadcast to both sender and receiver
            const { senderId, receiverId } = await getMessagePeers(messageId);
            if (senderId) io!.to(`user-${senderId}`).emit("reaction:update", { messageId, reactions: updated });
            if (receiverId) io!.to(`user-${receiverId}`).emit("reaction:update", { messageId, reactions: updated });
          }
          ack({ success: true, reactions: updated });
        } catch (e) {
          console.error("add-reaction error", e);
          ack({ success: false });
        }
      }
    );

    socket.on(
      "remove-reaction",
      async (
        { messageId, emoji, userId }: { messageId: string; emoji: string; userId: string },
        ack: Ack<{ success: boolean; reactions?: any[] }>
      ) => {
        try {
          const updated = await removeReactionJSON(messageId, { emoji, userId });
          const channelId = await getMessageChannelId(messageId);

          if (channelId) {
            // Channel message - broadcast to all channel members
            io!.to(`channel-${channelId}`).emit("reaction:update", { messageId, reactions: updated });
          } else {
            // DM message - broadcast to both sender and receiver
            const { senderId, receiverId } = await getMessagePeers(messageId);
            if (senderId) io!.to(`user-${senderId}`).emit("reaction:update", { messageId, reactions: updated });
            if (receiverId) io!.to(`user-${receiverId}`).emit("reaction:update", { messageId, reactions: updated });
          }
          ack({ success: true, reactions: updated });
        } catch (e) {
          console.error("remove-reaction error", e);
          ack({ success: false });
        }
      }
    );

    socket.on(
      "get-reactions",
      async ({ messageId }: { messageId: string }, ack: Ack<{ success: boolean; reactions?: any[] }>) => {
        try {
          const rows = await getReactions(messageId);
          ack({ success: true, reactions: rows });
        } catch (e) {
          console.error("get-reactions error", e);
          ack({ success: false });
        }
      }
    );

    // --------------
    // DISCONNECT
    // --------------
    socket.on("disconnect", (reason) => {
      const userId = socket.data.userId as string | undefined;
      // console.log("❌ Socket disconnected:", socket.id, reason, userId ? `(user ${userId})` : "");
      if (userId) handleUserDisconnect(userId, socket.id);
    });

    function handleUserDisconnect(userId: string, socketId: string) {
      if (!onlineUsers.has(userId)) return;
      const userSockets = onlineUsers.get(userId)!;
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        // console.log(`👤 User ${userId} is now offline`);
        try {
          // Broadcast a last-seen timestamp so clients can immediately show "last seen"
          const iso = new Date().toISOString();
          io!.emit("user-last-seen", { userId, timestamp: iso });
        } catch (e) {
          console.error("Failed to emit user-last-seen", e);
        }
      }
      const onlineUserIds = Array.from(onlineUsers.keys());
      io!.emit("users-online", onlineUserIds);
      // console.log(`📊 Online users: ${onlineUserIds.length}`);
    }
  });

  // Store globally for API access
  (global as any).socketIO = io;

  // console.log("✅ Socket.io server initialized successfully");
  return io;
}

export function getSocketIO(): ServerIO | null {
  return (global as any).socketIO || io;
}

export function emitToUser(userId: string, event: string, data: any) {
  const socketIO = getSocketIO();
  if (socketIO) {
    // console.log(`🔌 Emitting ${event} to user-${userId}`);
    socketIO.to(`user-${userId}`).emit(event, data);
    return true;
  }
  console.log("❌ Socket.io not available for emission");
  return false;
}

export function emitToChannel(channelId: string, event: string, data: any) {
  const socketIO = getSocketIO();
  if (socketIO) {
    // console.log(`🔌 Emitting ${event} to channel-${channelId}`);
    socketIO.to(`channel-${channelId}`).emit(event, data);
    return true;
  }
  // console.log("❌ Socket.io not available for emission");
  return false;
}

export function emitToAll(event: string, data: any) {
  const socketIO = getSocketIO();
  if (socketIO) {
    console.log(`🔌 Emitting ${event} to all users`);
    socketIO.emit(event, data);
    return true;
  }
  // console.log("❌ Socket.io not available for emission");
  return false;
}

export const initSocketServer = (req: any, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const initializedIO = initializeSocketIO(res.socket.server);
    res.socket.server.io = initializedIO;
  }
};
