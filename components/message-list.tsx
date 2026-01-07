"use client";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Trash,
  Edit,
  File,
  Maximize,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Check,
  Pin,
  Smile,
  Download,
  FileText,
  Reply,
  ReplyIcon,
  Copy,
  Loader2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSocket } from "@/lib/socket-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DownloadButton from "./DownloadButton";
import { MessageVideoComponent } from "./MessageVideoComponent";
import Link from "next/link";
import EmojiPicker from "emoji-picker-react";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { createPortal } from "react-dom";
import { ReactionPicker } from "./ReactionPicker";

// ------------------ TYPES ------------------
export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type Attachment = {
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
};

export type Reactions = Record<string, string[]>;

export type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  status?: MessageStatus;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    lastSeen?: Date | string;
    role?: string;
    departmentId?: string;
  };
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  attachments?: Attachment[];
  isPinned?: boolean;
  receiverId?: string | null;
  seenBy?: string[] | null;
  channelId?: string | null;
  pinnedMessageId?: string | null;
  pinnedPreview?: string | null;
  pinnedAuthor?: string | null;
  reactions?: Reactions;
};

export type MessageListProps = {
  messages: Message[];
  currentUserId?: string;
  onlineUsers?: string[];
};

// Note: electronAPI is provided by the Electron preload in this app.
// Avoid declaring global typing here to prevent conflicts; use `(window as any).electronAPI` where needed.

// ------------------ SUB-COMPS ------------------
const MessageStatusIcon = ({
  status,
  isCurrentUser,
}: {
  status?: MessageStatus;
  isCurrentUser: boolean;
}) => {
  if (!isCurrentUser) return null;

  // console.log(status,'statussssss')

  return (
    <span className="ml-1 flex items-center">
      {status === "sending" ? (
        <Loader2Icon className="h-3 w-3 text-gray-400 dark:text-gray-500 animate-spin" />
      ) : status === "sent" ? (
        <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      ) : status === "delivered" ? (
        <span className="flex -space-x-1">
          <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          <Check className="h-3 w-3 text-gray-400 dark:text-gray-500" />
        </span>
      ) : status === "read" ? (
        <span className="text-gray-600 dark:text-white text-xs">seen</span>
      ) : (
        <span className="flex -space-x-1">
          <Check className="h-3 w-3 text-blue-500 dark:text-blue-400" />
          <Check className="h-3 w-3 text-blue-500 dark:text-blue-400" />
        </span>
      )}
    </span>
  );
};

const LastSeenIndicator = ({
  lastSeen,
  isOnline,
}: {
  lastSeen?: Date | string;
  isOnline: boolean;
}) => {
  if (isOnline)
    return (
      <span className="text-xs text-green-500 dark:text-green-400">online</span>
    );
  if (lastSeen) {
    const lastSeenDate =
      typeof lastSeen === "string" ? new Date(lastSeen) : lastSeen;
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        last seen {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
      </span>
    );
  }
  return null;
};

const renderMessageWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (text.startsWith("@")) {
    const match = text.match(/^@(\w+)/);
    if (match) {
      const username = match.input;
      const rest = text.slice(match[0].length);
      return (
        <>
          <span className="text-blue-500 dark:text-blue-400 font-semibold">
            {username}
          </span>
          {/* <span>{rest}</span> */}
        </>
      );
    }
  }
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      const handleLinkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.openExternalLink) {
          electronAPI.openExternalLink(part);
        } else {
          // Fallback for non-Electron environment
          window.open(part, '_blank');
        }
      };
      return (
        <a
          key={index}
          href={part}
          onClick={handleLinkClick}
          className="text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="h-3 w-3" />
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// ------------------ MAIN ------------------
export default function MessageList({
  messages,
  currentUserId,
  onlineUsers,
}: MessageListProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    url: string;
    type: string | null;
    name?: string;
  } | null>(null);

  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<
    Record<string, MessageStatus>
  >({});
  const [openAttachmentReactionFor, setOpenAttachmentReactionFor] = useState<
    string | null
  >(null);
  const [openReactionFor, setOpenReactionFor] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, boolean>>(
    {}
  );

  const {
    deleteMessage,
    editMessage,
    markMessageAsRead,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
  } = useSocket() as any;

  const MAX_PREVIEW_LENGTH = 150;
  const MAX_PREVIEW_LINES = 3;

  // Mark messages as read when they enter viewport
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!markMessageAsRead) return;

    const toMark = new Set<string>();
    let flushTimer: number | null = null;

    const flush = () => {
      if (flushTimer) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      const ids = Array.from(toMark);
      if (ids.length > 0) {
        markMessageAsRead(ids);
        toMark.clear();
      }
    };
    //
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (document.visibilityState !== "visible") continue;
          const el = entry.target as HTMLElement;
          const id = el.id?.replace("msg-", "");
          if (!id) continue;
          const msg = messages.find((m) => m.id === id);
          if (!msg) continue;
          if (msg.senderId === currentUserId) continue;
          toMark.add(id);
        }
        if (toMark.size > 0) {
          if (flushTimer) window.clearTimeout(flushTimer);
          flushTimer = window.setTimeout(flush, 150);
        }
      },
      { threshold: 0.6 }
    );

    for (const m of messages) {
      const el = document.getElementById(`msg-${m.id}`);
      if (el) observer.observe(el);
    }

    return () => {
      observer.disconnect();
      if (flushTimer) window.clearTimeout(flushTimer);
    };
  }, [messages, currentUserId, markMessageAsRead]);

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    setIsEditing(true);
    try {
      await editMessage(messageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent("");
      toast.success("Message updated");
    } catch (error) {
      toast.error("Failed to update message");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setIsDeleting(messageId);
    try {
      await deleteMessage(messageId);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReplyByDoubleClick = (message: Message) => {
    const preview = (message.content || "").slice(0, 300);
    window.dispatchEvent(
      new CustomEvent("reply:message", {
        detail: {
          messageId: message.id,
          preview,
          senderName: message.sender?.name,
        },
      })
    );
  };

  // Pin/Unpin functionality

  useEffect(() => {
    const map: Record<string, boolean> = {};
    messages.forEach((m) => {
      map[m.id] = !!m.isPinned;
    });
    setPinnedMessages(map);
  }, [messages]);

  const handlePinMessage = async (
    messageId: string,
    isPinnedParam?: boolean
  ) => {
    const currentlyPinned =
      typeof isPinnedParam === "boolean"
        ? isPinnedParam
        : !!pinnedMessages[messageId];
    setIsPinning(messageId);
    setPinnedMessages((prev) => ({ ...prev, [messageId]: !currentlyPinned }));
    try {
      if (currentlyPinned) {
        await unpinMessage?.(messageId);
        toast.success("Message unpinned");
      } else {
        await pinMessage?.(messageId);
        toast.success("Message pinned");
        const pinnedMsg = messages.find((m) => m.id === messageId);
        if (pinnedMsg) {
          window.dispatchEvent(
            new CustomEvent("message:pinned", {
              detail: {
                id: pinnedMsg.id,
                content: pinnedMsg.content,
                senderName: pinnedMsg.sender?.name,
              },
            })
          );
        }
      }
    } catch (error) {
      setPinnedMessages((prev) => ({ ...prev, [messageId]: currentlyPinned }));
      toast.error(
        currentlyPinned ? "Failed to unpin message" : "Failed to pin message"
      );
    } finally {
      setIsPinning(null);
    }
  };

  // Reactions
  const [localReactions, setLocalReactions] = useState<
    Record<string, Reactions>
  >({});

  useEffect(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const m of messages) {
      const arr = Array.isArray((m as any).reactions)
        ? ((m as any).reactions as { emoji: string; userId: string }[])
        : [];
      const byEmoji: Record<string, string[]> = {};
      for (const r of arr) {
        if (!byEmoji[r.emoji]) byEmoji[r.emoji] = [];
        byEmoji[r.emoji].push(r.userId);
      }
      map[m.id] = byEmoji;
    }
    setLocalReactions(map);
  }, [messages]);

  useEffect(() => {
    const onRxn = (e: Event) => {
      const { messageId, reactions } = (
        e as CustomEvent<{
          messageId: string;
          reactions: { emoji: string; userId: string }[];
        }>
      ).detail;
      console.log("💬 MessageList received reaction update:", {
        messageId,
        reactions,
      });
      setLocalReactions((prev) => {
        const next = { ...prev };
        const byEmoji: Record<string, string[]> = {};
        for (const r of reactions) {
          if (!byEmoji[r.emoji]) byEmoji[r.emoji] = [];
          byEmoji[r.emoji].push(r.userId);
        }
        next[messageId] = byEmoji;
        return next;
      });
    };
    window.addEventListener("message:reaction-update", onRxn as EventListener);
    return () =>
      window.removeEventListener(
        "message:reaction-update",
        onRxn as EventListener
      );
  }, []);

  // Message status updates
  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const { messageId, status } = detail;
      if (!messageId || !status) return;
      setMessageStatuses((prev) => ({ ...prev, [messageId]: status }));
    };

    const onMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const { messageIds } = detail;
      if (!Array.isArray(messageIds)) return;
      setMessageStatuses((prev) => {
        const next = { ...prev };
        for (const id of messageIds) next[id] = "read";
        return next;
      });
    };

    window.addEventListener("message:status-update", onStatus as EventListener);
    window.addEventListener("messages:read", onMessagesRead as EventListener);

    return () => {
      window.removeEventListener(
        "message:status-update",
        onStatus as EventListener
      );
      window.removeEventListener(
        "messages:read",
        onMessagesRead as EventListener
      );
    };
  }, []);

  // Attachments
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, any[]>>(
    {}
  );

  const reactionButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const map: Record<string, any[]> = {};
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) map[m.id] = m.attachments;
    }
    setAttachmentsMap(map);
  }, [messages]);

  useEffect(() => {
    const onAttachmentsUpdated = (e: Event) => {
      const detail = (
        e as CustomEvent<{ messageId: string; attachments: any[] }>
      ).detail;
      if (!detail) return;
      setAttachmentsMap((prev) => ({
        ...prev,
        [detail.messageId]: detail.attachments,
      }));
    };
    window.addEventListener(
      "message:attachments-updated",
      onAttachmentsUpdated as EventListener
    );
    return () =>
      window.removeEventListener(
        "message:attachments-updated",
        onAttachmentsUpdated as EventListener
      );
  }, []);

  const getAttachments = (message: Message) =>
    attachmentsMap[message.id] ?? message.attachments ?? [];

  const toggleAttachmentReaction = async (
    messageId: string,
    attachmentIndex: number,
    emoji: string
  ) => {
    try {
      const res = await fetch("/api/messages/attachment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          attachmentIndex,
          action: "toggle-reaction",
          emoji,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data?.attachments) {
        setAttachmentsMap((prev) => ({
          ...prev,
          [messageId]: data.attachments,
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update reaction on attachment");
    }
  };

  const deleteAttachment = async (
    messageId: string,
    attachmentIndex: number
  ) => {
    try {
      const res = await fetch("/api/messages/attachment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, attachmentIndex, action: "delete" }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data?.attachments)
        setAttachmentsMap((prev) => ({
          ...prev,
          [messageId]: data.attachments,
        }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete attachment");
    }
  };

  const replyToAttachment = (message: Message, attachmentIndex: number) => {
    const attachments = getAttachments(message);
    const att = attachments[attachmentIndex];
    window.dispatchEvent(
      new CustomEvent("reply:attachment", {
        detail: { messageId: message.id, attachmentIndex, attachment: att },
      })
    );
  };

  const hasUserReacted = (msgId: string, emoji: string) => {
    const users = localReactions[msgId]?.[emoji] || [];
    return currentUserId ? users.includes(currentUserId) : false;
  };

  const toggleReaction = async (msg: Message, emoji: string) => {
    const msgId = msg.id;
    const userId = currentUserId;
    if (!userId) return;

    const already = hasUserReacted(msgId, emoji);

    setLocalReactions((prev) => {
      const next = { ...prev };
      const current = { ...(next[msgId] || {}) };
      const users = new Set(current[emoji] || []);
      if (already) users.delete(userId);
      else users.add(userId);
      const arr = Array.from(users);
      if (arr.length > 0) current[emoji] = arr;
      else delete current[emoji];
      next[msgId] = current;
      return next;
    });

    try {
      if (already) await removeReaction?.(msgId, emoji);
      else await addReaction?.(msgId, emoji);
    } catch (e) {
      setLocalReactions((prev) => {
        const next = { ...prev };
        const current = { ...(next[msgId] || {}) };
        const users = new Set(current[emoji] || []);
        if (already) users.add(userId!);
        else users.delete(userId!);
        const arr = Array.from(users);
        if (arr.length > 0) current[emoji] = arr;
        else delete current[emoji];
        next[msgId] = current;
        return next;
      });
      toast.error("Couldn't update your reaction");
    }
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };
  const shouldTruncate = (content: string) =>
    content.length > MAX_PREVIEW_LENGTH ||
    content.split("\n").length > MAX_PREVIEW_LINES;

  const renderMessageContent = (message: Message) => {
    const isExpanded = expandedMessages[message.id];
    const needsTruncation = shouldTruncate(message.content);

    // Handle attachment-reply marker injected by MessageInput. We expect the
    // marker to be appended to the message content like:
    //   "...user typed text...\n\n__ATTACH_REPLY__:{"messageId":"...","attachmentIndex":0}"
    // Parse that marker, render the referenced attachment (image/file/preview)
    // and then render the typed message below it. Do not show the raw marker.
    const MARKER = "__ATTACH_REPLY__:";
    if (message.content && message.content.includes(MARKER)) {
      const idx = message.content.lastIndexOf(MARKER);
      const typed = message.content.slice(0, idx).trim();
      const payloadStr = message.content.slice(idx + MARKER.length).trim();
      let parsed: { messageId?: string; attachmentIndex?: number } | null =
        null;
      try {
        parsed = JSON.parse(payloadStr);
      } catch (err) {
        // ignore parse errors and fall back to normal rendering below
        parsed = null;
      }

      if (parsed && parsed.messageId != null) {
        const orig = messages.find((m) => m.id === parsed!.messageId);
        const att = orig
          ? (attachmentsMap[orig.id] ?? orig.attachments ?? [])[
              parsed.attachmentIndex ?? 0
            ]
          : null;

        const preview = att ? (
          att.fileType?.startsWith("image/") ? (
            <div className="mb-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 w-max">
              <img
                src={att.fileUrl}
                alt={att.fileName || "attachment preview"}
                className="max-h-40 rounded-md object-contain"
              />
            </div>
          ) : (
            <div className="mb-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
              <div className="flex items-center gap-2">
                {getFileIcon(att.fileType)}
                <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  <div className="font-medium">{att.fileName || "File"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {att.fileType || "Unknown type"}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          // If we couldn't find the original attachment, show a simple textual reference
          <div className="mb-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-gray-100">
            Replying to attachment
          </div>
        );

        return (
          <div>
            {preview}
            <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
              {typed ? renderMessageWithLinks(typed) : null}
            </div>
          </div>
        );
      }
      // if parsing failed, fall through to normal behavior so marker isn't displayed raw
    }

    if (!needsTruncation)
      return (
        <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
          {renderMessageWithLinks(message.content)}
        </div>
      );
    if (isExpanded) {
      return (
        <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
          {renderMessageWithLinks(message.content)}
          <button
            onClick={() => toggleMessageExpansion(message.id)}
            className="text-blue-500 dark:text-blue-400 text-sm mt-2 flex items-center hover:text-blue-600 dark:hover:text-blue-300"
          >
            Show less <ChevronUp className="h-4 w-4 ml-1" />
          </button>
        </div>
      );
    }
    if (message.content.split("\n").length > MAX_PREVIEW_LINES) {
      const lines = message.content.split("\n");
      const truncated = lines.slice(0, MAX_PREVIEW_LINES).join("\n");
      return (
        <div>
          <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
            {renderMessageWithLinks(truncated + "...")}
          </div>
          <button
            onClick={() => toggleMessageExpansion(message.id)}
            className="text-blue-500 dark:text-blue-400 text-sm mt-2 flex items-center hover:text-blue-600 dark:hover:text-blue-300"
          >
            Read more <ChevronDown className="h-4 w-4 ml-1" />
          </button>
        </div>
      );
    }
    return (
      <div>
        <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
          {renderMessageWithLinks(
            message.content.substring(0, MAX_PREVIEW_LENGTH) + "..."
          )}
        </div>
        <button
          onClick={() => toggleMessageExpansion(message.id)}
          className="text-blue-500 dark:text-blue-400 text-sm mt-2 flex items-center hover:text-blue-600 dark:hover:text-blue-300"
        >
          Read more <ChevronDown className="h-4 w-4 ml-1" />
        </button>
      </div>
    );
  };

  const isMessageEdited = (message: Message) => {
    if (!message.updatedAt) return false;
    const created =
      typeof message.createdAt === "string"
        ? new Date(message.createdAt)
        : message.createdAt;
    const updated =
      typeof message.updatedAt === "string"
        ? new Date(message.updatedAt)
        : message.updatedAt;
    return updated.getTime() - created.getTime() > 1000;
  };

  const ReactionChip = ({
    emoji,
    count,
    active,
    onClick,
  }: {
    emoji: string;
    count: number;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "px-2.5 h-7 inline-flex items-center gap-1.5 rounded-full border text-xs transition-all shadow-sm",
        active
          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:shadow-md"
          : "bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md"
      )}
      title={active ? "Remove your reaction" : "React"}
      type="button"
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="min-w-[1ch] tabular-nums">{count}</span>
    </button>
  );



  const AttachmentReactionPicker = ({
    message,
    attachmentIndex,
    attKey,
    toggleAttachmentReaction,
    openAttachmentReactionFor,
    setOpenAttachmentReactionFor,
    buttonClassName,
  }: {
    message: Message;
    attachmentIndex: number;
    attKey: string;
    toggleAttachmentReaction: (
      messageId: string,
      attachmentIndex: number,
      emoji: string
    ) => void;
    openAttachmentReactionFor: string | null;
    setOpenAttachmentReactionFor: (
      value: string | null | ((prev: string | null) => string | null)
    ) => void;
    buttonClassName: string;
  }) => {
    const pickerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (openAttachmentReactionFor !== attKey) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        // Close only if clicking outside both the picker and the button
        if (
          pickerRef.current &&
          !pickerRef.current.contains(target) &&
          buttonRef.current &&
          !buttonRef.current.contains(target)
        ) {
          setOpenAttachmentReactionFor(null);
        }
      };

      // Add slight delay before attaching listener to prevent immediate closure
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [openAttachmentReactionFor, attKey]);

    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={(ev) => {
            ev.stopPropagation();
            setOpenAttachmentReactionFor((prev) =>
              prev === attKey ? null : attKey
            );
          }}
          className={buttonClassName}
          title="React to attachment"
          type="button"
        >
          <Smile className="h-4 w-4" />
        </button>

        {openAttachmentReactionFor === attKey && (
          <div
            ref={pickerRef}
            className="absolute right-0 mt-2 z-50 shadow-lg"
            onClick={(ev) => ev.stopPropagation()}
          >
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                toggleAttachmentReaction(
                  message.id,
                  attachmentIndex,
                  emojiData.emoji
                );
                setOpenAttachmentReactionFor(null);
              }}
              width={350}
              height={400}
              searchDisabled={false}
              skinTonesDisabled={false}
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (fileType: string | null | undefined) => {
    if (!fileType) return <File className="h-4 w-4" />;

    if (fileType.startsWith("image/")) return <File className="h-4 w-4" />;
    if (fileType.startsWith("video/")) return <File className="h-4 w-4" />;
    if (fileType.includes("pdf")) return <FileText className="h-4 w-4" />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <FileText className="h-4 w-4" />;
    if (fileType.includes("zip") || fileType.includes("compressed"))
      return <File className="h-4 w-4" />;

    return <File className="h-4 w-4" />;
  };

  const handleCopyMessage = async (message: Message) => {
    // Check if message has any content
    const hasContent =
      message.content || message.attachments?.length || message.fileUrl;
    if (!hasContent) {
      toast.info("Message is empty");
      return;
    }

    try {
      // Check if we're in Electron environment
      if ((window as any).electronAPI) {
        await handleCopyWithElectron(message);
      } else {
        await handleCopyWithWebAPI(message);
      }
    } catch (err) {
      console.error("Copy failed", err);
      toast.error("Couldn't copy the message to clipboard");
    }
  };

  // Electron-specific copy function
  const handleCopyWithElectron = async (message: Message) => {
    try {
      // First try to copy image if available
      const imageUrl = await getImageUrlToCopy(message);
      if (imageUrl && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.copyImage(imageUrl);
        if (result.success) {
          toast.success("Image copied to clipboard");
          return;
        } else {
          console.error("Electron image copy failed:", result.error);
          // Fall through to text copy
        }
      }

      // Copy text content
      const text = getTextContent(message);
      if ((window as any).electronAPI) {
        const result = await (window as any).electronAPI.copyText(text);
        if (result.success) {
          toast.success("Message copied to clipboard");
        } else {
          throw new Error(result.error);
        }
      }
    } catch (err) {
      console.error("Electron copy failed", err);
      throw err;
    }
  };

  // Web API fallback
  const handleCopyWithWebAPI = async (message: Message) => {
    try {
      // First try to copy image if available
      const imageToCopy = await getImageToCopy(message);
      if (imageToCopy) {
        const success = await copyImageToClipboard(imageToCopy);
        if (success) {
          toast.success("Image copied to clipboard");
          return;
        }
        // If image copy fails, fall through to text copy
      }

      // If no image or image copy failed, copy text content
      await copyTextContent(message);
      toast.success("Message copied to clipboard");
    } catch (err) {
      console.error("Web API copy failed", err);
      throw err;
    }
  };

  // Helper to get image URL for Electron
  const getImageUrlToCopy = async (
    message: Message
  ): Promise<string | null> => {
    try {
      // Check attachments first
      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0
      ) {
        const imageAttachment = message.attachments.find((attachment: any) =>
          attachment.fileType?.startsWith("image/")
        );
        if (imageAttachment) {
          return imageAttachment.fileUrl;
        }
      }

      // Check fileUrl if it's an image
      if (message.fileUrl && message.fileType?.startsWith("image/")) {
        return message.fileUrl;
      }

      return null;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  };

  // Get text content for both Electron and Web
  const getTextContent = (message: Message): string => {
    let text = message.content || "";

    // If no text content but has attachments, create a descriptive text
    if (
      !text &&
      Array.isArray(message.attachments) &&
      message.attachments.length > 0
    ) {
      const attachmentTexts = message.attachments.map(
        (att: any, index: number) =>
          `Attachment ${index + 1}: ${att.fileName || "File"} (${
            att.fileType || "Unknown type"
          })`
      );
      text = attachmentTexts.join("\n");
    }

    // If no text content but has fileUrl, create descriptive text
    if (!text && message.fileUrl) {
      text = `File: ${message.fileName || "File"} (${
        message.fileType || "Unknown type"
      })`;
    }

    if (!text.trim()) {
      text = "Empty message";
    }

    return text;
  };

  // Web API image copy functions
  const getImageToCopy = async (
    message: Message
  ): Promise<{ blob: Blob; name: string } | null> => {
    try {
      let imageUrl: string | null = null;
      let imageName: string = "image";

      // Check attachments first
      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0
      ) {
        const imageAttachment = message.attachments.find((attachment: any) =>
          attachment.fileType?.startsWith("image/")
        );
        if (imageAttachment) {
          imageUrl = imageAttachment.fileUrl;
          imageName = imageAttachment.fileName || "image";
        }
      }

      // Check fileUrl if it's an image
      if (
        !imageUrl &&
        message.fileUrl &&
        message.fileType?.startsWith("image/")
      ) {
        imageUrl = message.fileUrl;
        imageName = message.fileName || "image";
      }

      if (!imageUrl) {
        return null; // No image found
      }

      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error("Failed to fetch image:", response.status);
        return null;
      }

      const blob = await response.blob();
      return { blob, name: imageName };
    } catch (error) {
      console.error("Error getting image:", error);
      return null;
    }
  };

  // Web API image to clipboard
  const copyImageToClipboard = async (imageData: {
    blob: Blob;
    name: string;
  }): Promise<boolean> => {
    try {
      if (navigator.clipboard && (navigator.clipboard as any).write) {
        const ClipboardItem = (window as any).ClipboardItem;
        if (ClipboardItem) {
          const item = new ClipboardItem({
            [imageData.blob.type]: imageData.blob,
          });
          await (navigator.clipboard as any).write([item]);
          return true;
        }
      }
      return false; // Image copy not supported
    } catch (clipboardError) {
      console.error("Clipboard API failed:", clipboardError);
      return false;
    }
  };

  // Web API text copy
  const copyTextContent = async (message: Message): Promise<void> => {
    const text = getTextContent(message);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);

      try {
        const successful = document.execCommand("copy");
        if (!successful) {
          throw new Error("execCommand copy failed");
        }
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // Note: Do NOT early-return before hooks; render empty state conditionally in JSX below.

  // refs for scrolling behavior
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    // Prefer sentinel for reliable scrolling after layout/async image loads
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: "end" });
    } else if (scrollContainerRef.current) {
      const sc = scrollContainerRef.current;
      sc.scrollTop = sc.scrollHeight;
    }
  };

  // On first mount (page refresh), jump to the last message
  useEffect(() => {
    // Small rAF to ensure DOM painted before scrolling
    const id = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(id);
  }, []);

  // Whenever messages change, keep view at bottom
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  return (
    <div className="relative w-full min-h-full h-full bg-gray-100 dark:bg-gray-900">
      {/* Background Image - Light mode (absolute to container, not viewport) */}
      <div className="absolute inset-0 z-0 dark:hidden pointer-events-none">
        <img
          src="https://img.freepik.com/premium-photo/white-speech-bubbles-3d-chat-icons_1235831-169431.jpg?w=1480"
          alt="background"
          className="w-full h-full object-cover object-center brightness-95"
        />
      </div>

      {/* Background Image - Dark mode (absolute to container, not viewport) */}
      <div
        className="absolute inset-0 z-0 hidden dark:block pointer-events-none"
        style={{
          backgroundImage: `url('/d1.webp')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.8)",
        }}
      ></div>

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full min-h-full flex flex-col">
        {/* Dialog for file preview */}
        <Dialog
          open={!!selectedFile}
          onOpenChange={(open) => !open && setSelectedFile(null)}
        >
          <DialogContent className="w-[95vw] sm:max-w-[90vw] max-h-[90vh] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg z-50 p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100">
                {selectedFile?.type?.startsWith("image/")
                  ? "Image Preview"
                  : selectedFile?.type?.startsWith("video/")
                  ? "Video Preview"
                  : selectedFile?.type?.includes("pdf")
                  ? "PDF Document"
                  : "File Preview"}
              </DialogTitle>
            </DialogHeader>
            {selectedFile && (
              <div className="flex flex-col items-center justify-center p-2 sm:p-4">
                {selectedFile.type?.startsWith("image/") ? (
                  <div className="text-center">
                    <img
                      src={selectedFile.url}
                      alt="Preview"
                      className="max-h-[60vh] sm:max-h-[70vh] max-w-full object-contain rounded-lg mx-auto"
                    />
                    <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "image.png"}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 my-3 sm:my-5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md transition-colors mx-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </DownloadButton>
                  </div>
                ) : selectedFile.type?.startsWith("video/") ? (
                  <div className="flex flex-col items-center w-full">
                    <video
                      controls
                      className="max-h-[60vh] sm:max-h-[70vh] max-w-full w-full rounded-lg"
                    >
                      <source src={selectedFile.url} type={selectedFile.type} />
                      Your browser does not support the video tag.
                    </video>
                    {/* <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "video.mp4"}
                      className="flex items-center gap-2 px-4 py-2 my-5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Video
                    </DownloadButton> */}
                  </div>
                ) : selectedFile.type?.includes("pdf") ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <FileText className="h-16 w-16 text-red-500 mb-4" />
                    <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">
                      PDF files can't be previewed in the browser. Please
                      download to view.
                    </p>
                    <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "document.pdf"}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </DownloadButton>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <File className="h-16 w-16 text-gray-500 mb-4" />
                    <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">
                      This file type can't be previewed in the browser.
                    </p>
                    <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "file"}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download File
                    </DownloadButton>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Messages Container - Scrollable area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-2 sm:py-3"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(156, 163, 175, 0.5) transparent",
          }}
        >
          {/* Custom scrollbar for webkit browsers */}
          <style jsx global>{`
            .flex-1::-webkit-scrollbar {
              width: 6px;
            }
            .flex-1::-webkit-scrollbar-track {
              background: transparent;
            }
            .flex-1::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.5);
              border-radius: 3px;
            }
            .flex-1::-webkit-scrollbar-thumb:hover {
              background-color: rgba(156, 163, 175, 0.7);
            }
          `}</style>

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex items-center justify-center py-12 h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                  No messages yet
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  Start a conversation
                </p>
              </div>
            </div>
          )}

          <div className="max-w-8xl mx-auto space-y-1 sm:space-y-2">
            {messages.map((message, idx) => {
              const isCurrentUser = message?.senderId === currentUserId;
              const isOnline = !!onlineUsers?.includes(message.senderId);
              const createdAt =
                typeof message.createdAt === "string"
                  ? new Date(message.createdAt)
                  : message.createdAt;
              const senderImage = message.sender.image || "/placeholder.svg";
              const isPinned = !!pinnedMessages[message.id];

              const prev = messages[idx - 1];
              const isFirstInGroup =
                !prev || prev.senderId !== message.senderId;

              const rxn = localReactions[message.id] || {};
              const rxnEntries = Object.entries(rxn).sort(
                (a, b) => (b[1]?.length || 0) - (a[1]?.length || 0)
              );

              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className={`flex ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  } group relative`}
                >
                  <div
                    className={`flex ${
                      isCurrentUser ? "flex-row-reverse" : "flex-row"
                    } gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%]`}
                  >
                    {/* Avatar */}
                    {isFirstInGroup ? (
                      <div className="relative flex-shrink-0 hidden sm:block">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-white dark:border-gray-800 shadow-md">
                          <AvatarImage src={senderImage} />
                          <AvatarFallback className="bg-green-500 text-white font-medium text-xs sm:text-sm">
                            {message.sender.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && !isCurrentUser && (
                          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="h-8 w-8 sm:h-10 sm:w-10 hidden sm:block"
                        aria-hidden
                      />
                    )}

                    {/* Message Content */}
                    <div className="min-w-0 flex-1">
                      {isFirstInGroup && !isCurrentUser && (
                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 mb-0.5 sm:mb-1">
                          <Link
                            href={`/dashboard/messages/${message.senderId}`}
                          >
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-none">
                              {message.sender.name}
                            </p>
                          </Link>
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(createdAt, {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className="relative group">
                        <div
                          className={cn(
                            "relative px-3 py-2 sm:px-4 sm:py-3 shadow-sm max-w-full",
                            isCurrentUser
                              ? "bg-[#DCF8C6] dark:bg-[#134D37] text-gray-900 dark:text-white rounded-l-xl sm:rounded-l-2xl rounded-tr-xl sm:rounded-tr-2xl rounded-br-sm"
                              : "bg-white dark:bg-[#202C33] text-gray-900 dark:text-white rounded-r-xl sm:rounded-r-2xl rounded-tl-xl sm:rounded-tl-2xl rounded-bl-sm",
                            "border border-gray-200 dark:border-gray-600",
                            isPinned &&
                              "border-l-4 border-l-yellow-400 dark:border-l-yellow-500"
                          )}
                          onDoubleClick={() => {
                            if (editingMessageId) return;
                            handleReplyByDoubleClick(message);
                          }}
                          title="Double-click to reply"
                          style={{
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {editingMessageId === message.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[80px] text-sm resize-none border-gray-300 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                placeholder="Edit your message..."
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={isEditing}
                                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(message.id)}
                                  disabled={isEditing || !editContent.trim()}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  {isEditing ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Pinned Message */}
                              {message.pinnedMessageId && (
                                <div className="mb-3 flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 border border-yellow-200 dark:border-yellow-800">
                                  <Reply className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                      Reply Message
                                    </div>
                                    {(() => {
                                      const pinned = messages.find(
                                        (m) => m.id === message.pinnedMessageId
                                      );
                                      if (pinned) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              document
                                                .getElementById(
                                                  `msg-${pinned.id}`
                                                )
                                                ?.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "center",
                                                })
                                            }
                                            className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 hover:underline text-left w-full"
                                            title="Jump to original"
                                          >
                                            <span className="font-semibold">
                                              {pinned.sender.name}:{" "}
                                            </span>
                                            {pinned.content.slice(0, 160)}
                                            {pinned.content.length > 160 &&
                                              "..."}
                                          </button>
                                        );
                                      }
                                      return (
                                        <div className="text-sm text-yellow-700 dark:text-yellow-300 opacity-80">
                                          {message.pinnedAuthor ? (
                                            <span className="font-semibold">
                                              {message.pinnedAuthor}:{" "}
                                            </span>
                                          ) : null}
                                          {message.pinnedPreview ||
                                            "Referenced message"}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}

                              {/* Message Content */}
                              <div className="mb-2">
                                {renderMessageContent(message)}
                              </div>

                              {/* Attachments */}
                              {getAttachments(message).length > 0 && (
                                <div className="mt-3 space-y-3">
                                  {getAttachments(message).map((att, ai) => {
                                    const arr = Array.isArray(
                                      (att as any).reactions
                                    )
                                      ? ((att as any).reactions as {
                                          emoji: string;
                                          userId: string;
                                        }[])
                                      : [];
                                    const byEmoji: Record<string, string[]> =
                                      {};
                                    for (const r of arr) {
                                      if (!byEmoji[r.emoji])
                                        byEmoji[r.emoji] = [];
                                      byEmoji[r.emoji].push(r.userId);
                                    }
                                    const attEntries = Object.entries(
                                      byEmoji
                                    ).sort(
                                      (a, b) =>
                                        (b[1]?.length || 0) -
                                        (a[1]?.length || 0)
                                    );

                                    const attKey = `${message.id}:att:${ai}`;

                                    return (
                                      <div
                                        key={attKey}
                                        className="relative group"
                                      >
                                        {att.fileType?.startsWith("image/") ? (
                                          <div className="relative inline-block">
                                            <img
                                              src={att.fileUrl}
                                              alt={att.fileName || "Attachment"}
                                              className="max-h-48 sm:max-h-72 max-w-full rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-95 transition-opacity"
                                              onClick={() =>
                                                setSelectedFile({
                                                  url: att.fileUrl,
                                                  type: att.fileType ?? null,
                                                  name:
                                                    att.fileName || undefined,
                                                })
                                              }
                                            />
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedFile({
                                                    url: att.fileUrl,
                                                    type: att.fileType ?? null,
                                                    name:
                                                      att.fileName || undefined,
                                                  });
                                                }}
                                                className="bg-black/50 dark:bg-black/70 text-white p-2 rounded-full"
                                                title="Open image"
                                              >
                                                <Maximize className="h-4 w-4" />
                                              </button>

                                              {/* Reply to attachment */}
                                              <button
                                                onClick={(ev) => {
                                                  ev.stopPropagation();
                                                  replyToAttachment(
                                                    message,
                                                    ai
                                                  );
                                                }}
                                                className="bg-black/50 dark:bg-black/70 text-white p-2 rounded-full"
                                                title="Reply to attachment"
                                                type="button"
                                              >
                                                <Reply className="h-4 w-4" />
                                              </button>

                                              {/* Attachment reaction picker trigger */}
                                              <AttachmentReactionPicker
                                                message={message}
                                                attachmentIndex={ai}
                                                attKey={attKey}
                                                toggleAttachmentReaction={
                                                  toggleAttachmentReaction
                                                }
                                                openAttachmentReactionFor={
                                                  openAttachmentReactionFor
                                                }
                                                setOpenAttachmentReactionFor={
                                                  setOpenAttachmentReactionFor
                                                }
                                                buttonClassName="bg-black/50 dark:bg-black/70 text-white p-2 rounded-full"
                                              />

                                              {/* Delete attachment (only if current user is author) */}
                                              {isCurrentUser && (
                                                <button
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    // confirm before delete
                                                    if (
                                                      window.confirm(
                                                        "Delete this attachment?"
                                                      )
                                                    ) {
                                                      deleteAttachment(
                                                        message.id,
                                                        ai
                                                      );
                                                    }
                                                  }}
                                                  className="bg-red-600 text-white p-2 rounded-full"
                                                  title="Delete attachment"
                                                >
                                                  <Trash className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ) : att.fileType?.startsWith(
                                            "video/"
                                          ) ? (
                                          <MessageVideoComponent
                                            videoUrl={att.fileUrl}
                                            fileName={
                                              att.fileName || "video.mp4"
                                            }
                                            messageId={message.id}
                                            onPreview={(data) =>
                                              setSelectedFile(data)
                                            }
                                          />
                                        ) : (
                                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group">
                                            <div className="flex-shrink-0">
                                              {getFileIcon(att.fileType)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-xs sm:text-sm font-medium max-w-[150px] sm:max-w-none">
                                                {att.fileName ||
                                                  "Download file"}
                                              </p>
                                              <p className="truncate text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                                {att.fileType ||
                                                  "Unknown file type"}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() =>
                                                  setSelectedFile({
                                                    url: att.fileUrl,
                                                    type: att.fileType ?? null,
                                                    name:
                                                      att.fileName || undefined,
                                                  })
                                                }
                                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-500 transition-colors"
                                                title="Preview file"
                                              >
                                                <Maximize className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={(ev) => {
                                                  ev.stopPropagation();
                                                  replyToAttachment(
                                                    message,
                                                    ai
                                                  );
                                                }}
                                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-500 transition-colors"
                                                title="Reply to attachment"
                                                type="button"
                                              >
                                                <Reply className="h-4 w-4" />
                                              </button>
                                              <a
                                                href={att.fileUrl}
                                                download={
                                                  att.fileName || "file"
                                                }
                                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-500 transition-colors"
                                                title="Download file"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <Download className="h-4 w-4" />
                                              </a>

                                              {/* Attachment reaction trigger */}
                                              <AttachmentReactionPicker
                                                message={message}
                                                attachmentIndex={ai}
                                                attKey={attKey}
                                                toggleAttachmentReaction={
                                                  toggleAttachmentReaction
                                                }
                                                openAttachmentReactionFor={
                                                  openAttachmentReactionFor
                                                }
                                                setOpenAttachmentReactionFor={
                                                  setOpenAttachmentReactionFor
                                                }
                                                buttonClassName="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-500 transition-colors"
                                              />

                                              {/* Delete attachment */}
                                              {isCurrentUser && (
                                                <button
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    if (
                                                      window.confirm(
                                                        "Delete this attachment?"
                                                      )
                                                    ) {
                                                      deleteAttachment(
                                                        message.id,
                                                        ai
                                                      );
                                                    }
                                                  }}
                                                  className="text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                  title="Delete attachment"
                                                >
                                                  <Trash className="h-4 w-4" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {attEntries.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {attEntries.map(
                                              ([emoji, userIds]) => (
                                                <ReactionChip
                                                  key={emoji}
                                                  emoji={emoji}
                                                  count={userIds.length}
                                                  active={
                                                    currentUserId
                                                      ? userIds.includes(
                                                          currentUserId
                                                        )
                                                      : false
                                                  }
                                                  onClick={() =>
                                                    toggleAttachmentReaction(
                                                      message.id,
                                                      ai,
                                                      emoji
                                                    )
                                                  }
                                                />
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* File URL */}

                              {message.fileUrl && !message.attachments && (
                                <div className="mt-3">
                                  {message.fileType?.startsWith("image/") ? (
                                    <div className="relative group inline-block">
                                      <img
                                        src={message.fileUrl}
                                        alt={message.fileName || "Attachment"}
                                        className="max-h-72 rounded-2xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-95 transition-opacity"
                                        onClick={() =>
                                          setSelectedFile({
                                            url: message.fileUrl!,
                                            type: message.fileType ?? null,
                                            name: message.fileName || undefined,
                                          })
                                        }
                                      />
                                      <button
                                        onClick={() =>
                                          setSelectedFile({
                                            url: message.fileUrl!,
                                            type: message.fileType ?? null,
                                            name: message.fileName || undefined,
                                          })
                                        }
                                        className="absolute top-3 right-3 bg-black/50 dark:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        title="Open image"
                                      >
                                        <Maximize className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : message.fileType?.startsWith("audio/") ? (
                                    <div className="mt-2">
                                      <audio
                                        controls
                                        src={message.fileUrl}
                                        className="w-full rounded-md bg-white dark:bg-gray-800 p-2"
                                      >
                                        Your browser does not support the audio
                                        element.
                                      </audio>
                                      {message.fileName && (
                                        <div className="text-xs text-gray-500 mt-1 truncate">
                                          {message.fileName}
                                        </div>
                                      )}
                                    </div>
                                  ) : message.fileType?.startsWith("video/") ? (
                                    <MessageVideoComponent
                                      videoUrl={message.fileUrl}
                                      fileName={message.fileName || "video.mp4"}
                                      messageId={message.id}
                                      onPreview={(data) =>
                                        setSelectedFile(data)
                                      }
                                    />
                                  ) : (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group">
                                      <div className="flex-shrink-0">
                                        {getFileIcon(message.fileType)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                          {message.fileName || "Download file"}
                                        </p>
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                          {message.fileType ||
                                            "Unknown file type"}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() =>
                                            setSelectedFile({
                                              url: message.fileUrl!,
                                              type: message.fileType ?? null,
                                              name:
                                                message.fileName || undefined,
                                            })
                                          }
                                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-500 transition-colors"
                                          title="Preview file"
                                        >
                                          <Maximize className="h-4 w-4" />
                                        </button>
                                        <a
                                          href={message.fileUrl}
                                          download={message.fileName || "file"}
                                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-500 transition-colors"
                                          title="Download file"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download className="h-4 w-4" />
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Reactions */}
                              {rxnEntries.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {rxnEntries.map(([emoji, userIds]) => (
                                    <ReactionChip
                                      key={emoji}
                                      emoji={emoji}
                                      count={userIds.length}
                                      active={hasUserReacted(message.id, emoji)}
                                      onClick={() =>
                                        toggleReaction(message, emoji)
                                      }
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Message Actions */}
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 sm:gap-1",
                            "sm:top-1/2 sm:-translate-y-1/2"
                          )}
                          style={{
                            [isCurrentUser ? "left" : "right"]:
                              window.innerWidth < 640 ? "-35px" : "-45px",
                          }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleCopyMessage(message)}
                              >
                                <Copy className="h-4 w-4 mr-2" /> Copy
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                ref={reactionButtonRef}
                                onClick={() => {
                                  setOpenReactionFor(message.id);
                                }}
                              >
                                <Smile className="h-4 w-4 mr-2" /> React
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleReplyByDoubleClick(message)
                                }
                                className="text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                <Reply className="h-4 w-4 mr-2" /> Reply
                              </DropdownMenuItem>

                              {isCurrentUser && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleEditMessage(message)}
                                    className="text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteMessage(message.id)
                                    }
                                    disabled={isDeleting === message.id}
                                    className="text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    {isDeleting === message.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <ReactionPicker
                          message={message}
                          isOpen={openReactionFor === message.id}
                          anchorRef={reactionButtonRef}
                          onClose={() => setOpenReactionFor(null)}
                          onReact={(emoji) => toggleReaction(message, emoji)}
                        />

                        {!editingMessageId && (
                          <div
                            className={`flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 ${
                              isCurrentUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(createdAt, {
                                addSuffix: true,
                              })}
                              {/* {isMessageEdited(message) && " • seen"}  */}
                            </span>
                            {isCurrentUser && (
                              <MessageStatusIcon
                                status={
                                  messageStatuses[message.id] || message.status
                                }
                                isCurrentUser={isCurrentUser}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} className="h-px" />
          </div>
        </div>
      </div>
    </div>
  );
}
