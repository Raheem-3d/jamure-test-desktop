// hooks/useSocket.ts
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { tabNotifier } from "@/lib/tabBlinker";
// import { tabNotifier } from "@/utils/tabNotifier"
import dynamic from "next/dynamic";
// Sound Player Class

type ReactionUpdatePayload = {
  messageId: string;
  reactions: { emoji: string; userId: string; userName?: string }[];
};

type BuzzParams = { channelId?: string; receiverId?: string };

class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private buffer: AudioBuffer | null = null;

  async init() {
    if (this.initialized || typeof window === "undefined") return;
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const response = await fetch("/mixkit-correct-answer-tone-2870.wav");
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.initialized = true;
    } catch (e) {
      console.error("Error initializing audio:", e);
    }
  }

  async play() {
    if (!this.initialized) await this.init();
    if (!this.audioContext || !this.buffer) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }
}

export const soundPlayer = new SoundPlayer();

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [buzzerEnabled, setBuzzerEnabled] = useState(true);

  const prevOnlineUsersRef = useRef<string[]>([]);
  const { data: session } = useSession();
  const LAST_SEEN_STORAGE_KEY = "lastSeenMap";
  const GRACE_MS = 45_000; // 45s grace to avoid flapping
  const offlineTimers = new Map<string, number>(); // userId -> timeoutId
  const userCacheRef = useRef<Record<string, { name?: string; image?: string | null }>>({});

  // state (make sure it's string map, not Date)
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(LAST_SEEN_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  function persistLastSeen(next: Record<string, string>) {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(next));
  }

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: {
      messageId: string;
      reactions: { emoji: string; userId: string; userName?: string }[];
    }) => {
      window.dispatchEvent(
        new CustomEvent("message:reaction-update", { detail: payload })
      );
    };
    socket.on("reaction:update", handler);
    // return () => socket.off("reaction:update", handler)
    return () => {
      socket.off("reaction:update", handler);
    };
  }, [socket]);

  const showNotification = useCallback(
    (title: string, body: string, icon?: string) => {
      // ✅ Electron
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.notify
      ) {
        (window as any).electronAPI.notify(title, body, icon);
        return;
      }

      // ✅ Browser
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, {
          body,
          icon: icon || "/favicon.ico",
          badge: "/favicon.ico",
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        setTimeout(() => notification.close(), 7000);
      }
    },
    []
  );

  const playNotificationSound = useCallback(() => {
    if (!buzzerEnabled) return;
    soundPlayer.init();
    try {
      soundPlayer.play();
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, [buzzerEnabled]);

  const handleNewMessage = useCallback(
    (message: any) => {
      // Dispatch event for UI components to handle message display
      window.dispatchEvent(
        new CustomEvent("socket-message", { detail: message })
      );
      
      // Get current user ID from session
      const currentUserId = (session as any)?.user?.id;
      
      // Only play sound and show notifications if the message is NOT from the current user
      const isOwnMessage = message.senderId === currentUserId;
      
      if (!isOwnMessage) {
        // Check if user is currently viewing this conversation
        const currentPath = window.location.pathname;
        const isInActiveConversation = 
          (message.channelId && currentPath.includes(`/channels/${message.channelId}`)) ||
          (message.senderId && currentPath.includes(`/messages/${message.senderId}`));
        
        // Only play sound and show notifications if NOT in the active conversation
        // or if window is hidden/unfocused
        const shouldNotify = !isInActiveConversation || 
                            document.visibilityState === "hidden" || 
                            !document.hasFocus();
        
        if (shouldNotify) {
          playNotificationSound();
          
          const notificationTitle = `New message from ${message.sender.name}`;
          const notificationBody = message.content || "Sent a file";
          
          // Only show desktop notification if window is hidden or not focused
          if (document.visibilityState === "hidden" || !document.hasFocus()) {
            showNotification(notificationTitle, notificationBody, message.sender.image || undefined);
          }

          // Handle tab/window states - only for messages from others 
          if (document.visibilityState === "hidden") {
            if (tabNotifier.checkOtherTabs()) {
              // Blink in the existing tab
              tabNotifier.startNotification(notificationTitle);
            } else {
              // Open new window
              tabNotifier.focusOrOpenApp(
                `/messages/${message.channelId || message.sender.id}`
              );
            }
          } else if (!document.hasFocus()) {
            // Tab is visible but not focused
            tabNotifier.startNotification(notificationTitle);
          }
        }
      }
    },
    [playNotificationSound, showNotification, session]
  );




const channelCacheRef = useRef<Record<string, { name?: string }>>({});

useEffect(() => {
  if (!socket) return;

  let alive = true;

  const onBuzz = (payload: {
    channelId?: string;
    fromUserId?: string;
    message?: string;
  }) => {
    (async () => {
      const msg = payload?.message || "Buzz!";
      const fromId = payload?.fromUserId || "";
      const channelId = payload?.channelId || "";

      // try cache first
      let displayName: string | undefined = userCacheRef.current[fromId]?.name;
      let avatar: string | null | undefined = userCacheRef.current[fromId]?.image;
      let channelName: string | undefined = channelId
        ? channelCacheRef.current[channelId]?.name
        : undefined;

      console.debug("Buzz payload:", { channelId, fromId, message: msg });
      console.debug("Pre-cache:", { displayName, channelName });

      // Fetch user if missing
      if (!displayName && fromId) {
        try {
          const userRes = await fetch(`/api/users/${fromId}`);
          if (userRes.ok) {
            const u = await userRes.json();
            // adjust these keys if your API shape differs
            displayName = u?.name || u?.fullName || u?.username;
            avatar = u?.image || u?.avatarUrl || null;
            userCacheRef.current[fromId] = { name: displayName, image: avatar ?? null };
          } else {
            console.warn(`/api/users/${fromId} returned status`, userRes.status);
          }
        } catch (err) {
          console.error("User fetch error:", err);
        }
      }

      // Fetch channel if we have a channelId and no cached channelName
      if (channelId && !channelName) {
        try {
          const channelRes = await fetch(`/api/channels/${channelId}`);
          if (channelRes.ok) {
            const c = await channelRes.json();
            console.debug("Channel API response:", c);
            // adapt to your API shape. Common possibilities:
            // 1) { name: "X" }
            // 2) { data: { name: "X" } }
            // 3) { channel: { name: "X" } }
            // Try a few fallbacks:
            channelName =
              c?.name || c?.data?.name || c?.channel?.name || (typeof c === "string" ? c : undefined);
            if (channelName) {
              channelCacheRef.current[channelId] = { name: channelName };
            } else {
              console.warn("channel name not found in response shape", c);
            }
          } else {
            console.warn(`/api/channels/${channelId} returned status`, channelRes.status);
          }
        } catch (err) {
          console.error("Channel fetch error:", err);
        }
      }

      console.debug("Resolved names:", { displayName, channelName });

      if (!alive) return;

      const title = displayName
        ? channelName
          ? `${displayName} buzzed you in ${channelName}`
          : `${displayName} buzzed you`
        : "Buzz!";

      try {
        playNotificationSound();
      } catch (err) {
        console.error("Sound play error:", err);
      }

      // Toast: show channel name when available
      toast.info(displayName ? `${title} — ${msg}` : msg, {
        description:
          displayName && channelName
            ? `From: ${displayName}\nChannel: ${channelName}`
            : displayName
            ? `From: ${displayName}`
            : undefined,
      });

      // In-app open event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat:open", {
            detail: { userId: fromId || null, channelId: channelId || null, source: "buzz" },
          })
        );
      }

      // Desktop / SW notification when not focused
      const shouldNotify =
        typeof document !== "undefined" &&
        (document.visibilityState === "hidden" || !document.hasFocus());

      const targetUrl = channelId
        ? `/dashboard/channels/${channelId}`
        : fromId
        ? `/u/${fromId}`
        : "/dashboard/messages";

      if (shouldNotify) {
        try {
          const win = window as any;
          if (win?.electronAPI?.buzz) {
            win.electronAPI.buzz({
              title,
              body: msg,
              icon: avatar,
              userId: fromId || null,
              channelId: channelId || null,
            });
          } else {
            showBuzzNotification(title, msg, targetUrl);
          }
          tabNotifier?.startNotification?.(title);
        } catch (err) {
          console.error("Desktop notification error:", err);
        }
      }

      // visual shake
      if (typeof document !== "undefined") {
        document.documentElement.classList.add("shake");
        setTimeout(() => document.documentElement.classList.remove("shake"), 600);
      }
    })();
  };

  socket.on("buzz", onBuzz);

  return () => {
    alive = false;
    socket.off("buzz", onBuzz);
  };
}, [socket, playNotificationSound]);



  async function showBuzzNotification(
    title: string,
    body: string,
    url: string
  ) {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      tag: "buzz",
      requireInteraction: true, // stays until user acts
      data: { url }, // SW uses this to open/focus
      icon: "/icons/icon-192.png", // put real icon files
      badge: "/icons/badge.png",
      // Some browsers support renotify but TS lib doesn't include it; omit here
    });
  }

  const toastIdFor = (n: any) => {
    if (n.type === "CHANNEL_MESSAGE" && n.messageId)
      return `chmsg:${n.messageId}`;
    if (n.type === "DIRECT_MESSAGE" && n.messageId) return `dm:${n.messageId}`;
    if (n.type === "TASK_ASSIGNED" && (n.taskId || n.id))
      return `task:${n.taskId ?? n.id}`;
    if (n.type === "CHANNEL" && (n.channelId || n.id))
      return `ch:${n.channelId ?? n.id}`;
     if (n.type === "CHANNEL_INVITE" && (n.channelId || n.id))
      return `ch:${n.channelId ?? n.id}`;
    if (n.type === "USER" && (n.senderId || n.id))
      return `usr:${n.senderId ?? n.id}`;
    if (n.type === "REMINDER" && n.id) return `rem:${n.id}`;
    // final fallback (content + type)
    return `${n.type}:${n.content}`;
  };

  const handleNewNotification = useCallback(
    (notification: any) => {
      window.dispatchEvent(
        new CustomEvent("socket-notification", { detail: notification })
      );
      // Only play sound and show notification once
      playNotificationSound();
      const id = toastIdFor(notification);
      toast.info(notification.content, {
        id,
        duration: 5000,
        action:
          notification.channelId || notification.userId || notification.taskId
            ? {
                label: "View",
                onClick: () => {
                  if (
                    notification.type === "CHANNEL_MESSAGE" &&
                    notification.channelId
                  ) {
                    window.location.href = `/dashboard/channels/${notification.channelId}`;
                  } else if (notification.type === "DIRECT_MESSAGE") {
                    // Prefer opening sender's chat when notification originates from another user
                    if (
                      notification.senderId &&
                      notification.senderId !== notification.userId
                    ) {
                      window.location.href = `/dashboard/messages/${notification.senderId}`;
                    } else if (notification.receiverId) {
                      window.location.href = `/dashboard/messages/${notification.receiverId}`;
                    } else if (notification.messageId) {
                      // Fallback: some clients may still rely on messageId; only use if route supports it
                      window.location.href = `/dashboard/messages/${notification.messageId}`;
                    }
                  } else if (notification.type === "TASK_ASSIGNED") {
                    const taskId = notification.taskId || notification.id;
                    if (taskId)
                      window.location.href = `/dashboard/tasks/${taskId}`;
                  } else if (notification.type === "CHANNEL") {
                    const channelId = notification.channelId || notification.id;
                    if (channelId)
                      window.location.href = `/dashboard/channels/${channelId}`;
                  }else if (notification.type === "CHANNEL_INVITE") {
                    const channelId = notification.channelId || notification.id;
                    if (channelId)
                      window.location.href = `/dashboard/channels/${channelId}`;
                  } else if (notification.type === "USER") {
                    const userId = notification.senderId || notification.id;
                    if (userId)
                      window.location.href = `/dashboard/messages/${userId}`;
                  } else if (notification.type === "REMINDER") {
                    window.location.href = `/dashboard/reminders`;
                  } else {
                    window.location.href = `/dashboard`;
                  }
                },
              }
            : undefined,
      });
      // 🔔 Trigger Electron desktop notification for channel messages and reminders
      // NOTE: Don't send notifications for CHANNEL_MESSAGE or DIRECT_MESSAGE here 
      // because they are already handled by handleNewMessage handler above
      const shouldShowElectronNotification = 
        document.visibilityState === "hidden" || !document.hasFocus();
      
      if (shouldShowElectronNotification && typeof window !== "undefined") {
        const win = window as any;
        if (win?.electronAPI?.notify) {
          let notifTitle = "Notification";
          let notifBody = notification.content || "";
          let messageId = notification.messageId || notification.id;
          let channelId = notification.channelId || null;
          let userId = notification.senderId || notification.userId || null;
          let senderName = notification.senderName || "";

          // Skip message notifications here - they're handled by handleNewMessage
          if (notification.type !== "CHANNEL_MESSAGE" && notification.type !== "DIRECT_MESSAGE") {
            if (notification.type === "REMINDER") {
              notifTitle = "⏰ Reminder";
            } else if (notification.type === "TASK_ASSIGNED") {
              notifTitle = "📋 Task Assigned";
            } else if (notification.type === "CHANNEL_INVITE") {
              notifTitle = "📢 Channel Invite";
            }

            // Send Electron notification for non-message types
            win.electronAPI.notify(notifTitle, notifBody, undefined, {
              senderName,
              messagePreview: notifBody,
              messageId,
              channelId,
              userId,
            });
          }
        }
      }
    },
    [playNotificationSound, showNotification]
  );


  //  
  useEffect(() => {
    if (!(session as any)?.user?.id) return;

    // console.log("🔌 Initializing Socket.io connection...");
    setConnectionAttempted(true);

    const initializeAndConnect = async () => {
      try {
        await fetch("/api/socket/init");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const socketInstance = io({
          path: "/api/socket",
          transports: ["polling"],
          forceNew: true,
          timeout: 10000,
        });

        socketInstance.on("connect", () => {
          setIsConnected(true);
          setSocket(socketInstance);
          const uid = (session as any)?.user?.id;
          if (uid) socketInstance.emit("user-join", uid);
          // toast.success("Connected to real-time updates", { duration: 2000 })
        });

        socketInstance.on("connect_error", (error) => {
          console.error("❌ Socket.io connection error:", error);
          setIsConnected(false);
          toast.error("Failed to connect to real-time updates", {
            description: "Some features may not work properly",
            duration: 5000,
          });
        });

        socketInstance.on("disconnect", (reason) => {
          console.log("🔌 Socket.io disconnected:", reason);
          setIsConnected(false);
          // toast.warning("Disconnected from real-time updates", { duration: 3000 })
        });

        socketInstance.on("users-online", (users: string[]) => {
          const prevUsers = prevOnlineUsersRef.current;

          // 1) Any user reported online now: cancel pending offline timer
          for (const id of users) {
            const t = offlineTimers.get(id);
            if (t) {
              clearTimeout(t);
              offlineTimers.delete(id);
            }
          }

          const maybeOffline = prevUsers.filter((id) => !users.includes(id));

          for (const id of maybeOffline) {
            if (offlineTimers.has(id)) continue; // already scheduled
            const timeoutId = window.setTimeout(() => {
              // After grace window, if still not online, stamp lastSeen
              if (!prevOnlineUsersRef.current.includes(id)) {
                const iso = new Date().toISOString();
                setLastSeenMap((prev) => {
                  const next = { ...prev, [id]: iso };
                  persistLastSeen(next);
                  return next;
                });
              }
              offlineTimers.delete(id);
            }, GRACE_MS);
            offlineTimers.set(id, timeoutId);
          }

          // 3) Update online list and snapshot for next tick
          setOnlineUsers(users);
          prevOnlineUsersRef.current = users;
        });

        socketInstance.on("new-message", handleNewMessage);

        socketInstance.on("new-notification", handleNewNotification);

        socketInstance.on(
          "message-status-updated",
          ({ messageId, userId, status }) => {
            // legacy event for some consumers
            window.dispatchEvent(
              new CustomEvent("update-message-status", {
                detail: { messageId, userId, status },
              })
            );
            // standard event other components listen for
            window.dispatchEvent(
              new CustomEvent("message:status-update", {
                detail: { messageId, status },
              })
            );
          }
        );

        socketInstance.on("user-last-seen", ({ userId, timestamp }) => {
          window.dispatchEvent(
            new CustomEvent("update-user-last-seen", {
              detail: { userId, timestamp },
            })
          );
        });

    

        return socketInstance;
      } catch (error) {
        console.error("Failed to initialize Socket.io:", error);
        setIsConnected(false);
        return null;
      }
    };

    const socketPromise = initializeAndConnect();

    return () => {
      socketPromise.then((socketInstance) => {
        if (socketInstance) {
          const uid = (session as any)?.user?.id;
          if (uid) socketInstance.emit("user-offline", uid);
          socketInstance.off("new-message", handleNewMessage);
          socketInstance.off("new-notification", handleNewNotification);
          socketInstance.disconnect();
        }
      });
    };
  }, [(session as any)?.user?.id, handleNewMessage, handleNewNotification]);

  const joinChannel = useCallback(
    (channelId: string) => {
      if (socket && isConnected) {
        socket.emit("join-channel", channelId);
        console.log("📺 Joined channel:", channelId);
      }
    },
    [socket, isConnected]
  );

  const joinMessageRoom = useCallback(
    (messageId: string) => {
      socket?.emit("join-message", { messageId });
    },
    [socket]
  );

  const leaveChannel = useCallback(
    (channelId: string) => {
      if (socket && isConnected) {
        socket.emit("leave-channel", channelId);
        console.log("📺 Left channel:", channelId);
      }
    },
    [socket, isConnected]
  );

  const sendMessage = useCallback(
    (message: any) => {
      if (socket && isConnected) {
        socket.emit("send-message", message);
        console.log("📨 Sent message via socket:", message.id);
      }
    },
    [socket, isConnected]
  );

  const sendNotification = useCallback(
    (notification: any) => {
      if (socket && isConnected) {
        socket.emit("send-notification", notification);
        console.log("🔔 Sent notification via socket:", notification.id);
      }
    },
    [socket, isConnected]
  );

  const toggleBuzzer = useCallback(() => {
    setBuzzerEnabled((prev) => !prev);
    toast.info(`Buzzer ${buzzerEnabled ? "disabled" : "enabled"}`);
  }, [buzzerEnabled]);

  // In your useSocket hook
  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!socket || !isConnected || !(session as any)?.user?.id) return false;
      return new Promise((resolve) => {
        socket.emit(
          "add-reaction",
          {
            messageId,
            emoji,
            userId: (session as any).user.id,
            userName: (session as any).user.name || "Unknown",
          },

          (response: {
            success: boolean;
            reactions?: ReactionUpdatePayload["reactions"];
          }) => {
            if (response.success && response.reactions) {
              window.dispatchEvent(
                new CustomEvent("message:reaction-update", {
                  detail: { messageId, reactions: response.reactions },
                })
              );
            }
            resolve(response.success);
          }
        );
      });
    },
    [socket, isConnected, (session as any)?.user?.id, (session as any)?.user?.name]
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!socket || !isConnected || !(session as any)?.user?.id) return false;
      return new Promise((resolve) => {
        socket.emit(
          "remove-reaction",
          { messageId, emoji, userId: (session as any).user.id },
          (response: {
            success: boolean;
            reactions?: ReactionUpdatePayload["reactions"];
          }) => {
            if (response.success && response.reactions) {
              window.dispatchEvent(
                new CustomEvent("message:reaction-update", {
                  detail: { messageId, reactions: response.reactions },
                })
              );
            }
            resolve(response.success);
          }
        );
      });
    },
    [socket, isConnected, (session as any)?.user?.id]
  );

  const sendBuzz = useCallback(
    ({ channelId, receiverId }: BuzzParams) => {
      if (!socket || !isConnected || !(session as any)?.user?.id)
        return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        let settled = false;
        const t = setTimeout(() => {
          if (!settled) resolve(false);
        }, 8000);

        socket.emit(
          "buzz:send",
          { channelId, receiverId },
          (resp: { ok: boolean; reason?: string }) => {
            settled = true;
            clearTimeout(t);
            if (!resp?.ok && resp?.reason === "rate_limited") {
              toast.error("Too many buzzes. Try later.");
            }
            resolve(!!resp?.ok);
          }
        );
      });
    },
    [socket, isConnected, (session as any)?.user?.id]
  );

  return {
    socket,
    isConnected,
    connectionAttempted,
    onlineUsers,
    lastSeenMap,
    buzzerEnabled,
    toggleBuzzer,
    joinChannel,
    leaveChannel,
    sendMessage,
    sendNotification,
    addReaction,
    removeReaction,
    joinMessageRoom,
    sendBuzz,
  };
}
