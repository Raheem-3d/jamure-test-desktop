

// =====================
// MessageInput tsx - WhatsApp Style
// =====================
"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Paperclip,
  File,
  X,
  Loader2,
  Smile,
  AtSign,
  Copy,
  Video,
  Music,
  BellRing,
  Mic,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { MessageRewriter } from "@/components/message-rewriter";

export type Mentionable = {
  id: string;
  name: string;
  type: "user" | "channel";
  avatarUrl?: string | null;
};

type MessageInputProps = {
  channelId?: string;
  receiverId?: string;
  onMessageSent?: () => void;
  mentionables?: Mentionable[];
};

type UploadedFileData = {
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
};

type PinnedRef = { id: string; author?: string; preview?: string };

export default function MessageInput({
  channelId,
  receiverId,
  onMessageSent,
  mentionables = [],
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pinned, setPinned] = useState<PinnedRef | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<{
    messageId: string;
    preview?: string | null;
    senderName?: string | null;
  } | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<{
    messageId: string;
    attachmentIndex: number;
    attachment?: {
      fileUrl: string;
      fileName?: string | null;
      fileType?: string | null;
    } | null;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 // mentions state
 
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [mentionsChannelUser, setMentionsChannelUser] = useState<Mentionable[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { sendBuzz, isConnected } = useSocket();

  // Listen for pinned message event from MessageList
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        id: string;
        content?: string;
        senderName?: string;
      }>;
      const d = ce.detail;
      if (!d) return;
      setPinned({
        id: d.id,
        author: d.senderName,
        preview: (d.content || "").slice(0, 120),
      });
    };
    window.addEventListener("message:pinned", handler as EventListener);
    return () =>
      window.removeEventListener("message:pinned", handler as EventListener);
  }, []);

  // Listen for reply-to-message events (double-click dispatch from MessageList)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        messageId: string;
        preview?: string;
        senderName?: string;
      }>;
      const d = ce.detail;
      if (!d || !d.messageId) return;
      setReplyToMessage({
        messageId: d.messageId,
        preview: d.preview ?? null,
        senderName: d.senderName ?? null,
      });
      // Also pin reference so server sees pinnedMessageId if necessary
      setPinned({
        id: d.messageId,
        author: d.senderName,
        preview: d.preview ? d.preview.slice(0, 120) : undefined,
      });
    };
    window.addEventListener("reply:message", handler as EventListener);
    return () =>
      window.removeEventListener("reply:message", handler as EventListener);
  }, []);

  // Listen for reply-to-attachment events
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        messageId: string;
        attachmentIndex: number;
        attachment?: any;
      }>;
      const d = ce.detail;
      if (!d) return;
      setReplyAttachment({
        messageId: d.messageId,
        attachmentIndex: d.attachmentIndex,
        attachment: d.attachment || null,
      });
      // also set pinned reference for server-side pinnedMessageId usage
      setPinned({ id: d.messageId, author: undefined, preview: undefined });
    };
    window.addEventListener("reply:attachment", handler as EventListener);
    return () =>
      window.removeEventListener("reply:attachment", handler as EventListener);
  }, []);

  // Autosize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 500);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > 500 ? "auto" : "hidden";
  }, [message]);

  // Paste files (all types supported)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.files.length) return;
      const pastedFiles = Array.from(e.clipboardData.files);
      // Accept all file types now, not just images
      if (pastedFiles.length) {
        handleNewFiles(pastedFiles);
        toast.success(`${pastedFiles.length} file(s) ready to send`);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  // Global Enter key handler for file-only sends (when textarea is empty but files exist)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key without shift
      if (e.key !== "Enter" || e.shiftKey) return;
      
      // Don't interfere if mention picker is open
      if (mentionOpen) return;
      
      // Don't trigger if user is typing in the textarea with text
      if (message.trim().length > 0) return;
      
      // Only trigger if we have files but no message (file-only send)
      if (files.length > 0 && !isSubmitting && !isUploading) {
        // Check if the active element is within our dropZoneRef or the textarea
        const activeEl = document.activeElement;
        const isInComponent = dropZoneRef.current?.contains(activeEl) || 
                              activeEl === textareaRef.current ||
                              activeEl === document.body;
        
        if (isInComponent) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };
    
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [files.length, message, mentionOpen, isSubmitting, isUploading]);

  // Click outside to close mentions
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node))
        setMentionOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load mentionable
  useEffect(() => {
    let abort = false;

    async function loadMentionables() {
      setLoadingMentions(true);
      try {
        if (channelId) {
          const res = await fetch(
            `/api/messages/mentionables?channelId=${encodeURIComponent(
              channelId
            )}`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error("Failed to load mentionables (channel)");
          const data = await res.json();
          if (!abort) setMentionsChannelUser(data.mentionables ?? []);
        }
      } catch (e) {
        console.log(e);
        setMentionsChannelUser([]);
      } finally {
        if (!abort) setLoadingMentions(false);
      }
    }

    loadMentionables();
    return () => {
      abort = true;
    };
  }, [channelId]);

  const handleNewFiles = (newFiles: File[]) => {
    const oversized = newFiles.filter((f) => f.size > 5 * 1024 * 1024 * 1024);
    if (oversized.length) {
      toast.error("Files must be smaller than 5GB");
      return;
    }
    setFiles((prev) => {
      if (prev.length + newFiles.length > 50) {
        toast.error("You can only upload up to 50 files at once");
        return prev;
      }
      return [...prev, ...newFiles];
    });
  };

  // FIXED: Reset file input after selection to allow selecting same file again
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    handleNewFiles(Array.from(e.target.files));

    // Reset the file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  // Copy image file (or fallback to base64 text) to clipboard
  const copyImage = async (i: number) => {
    const file = files[i];
    if (!file) return;

    try {
      // Prefer the async clipboard write with a ClipboardItem (image binary)
      if (navigator.clipboard && (navigator.clipboard as any).write) {
        const blob = file.slice(0, file.size, file.type);
        const ClipboardItemCtor =
          (window as any).ClipboardItem || (window as any).ClipboardItem;
        if (typeof ClipboardItemCtor === "function") {
          const item = new ClipboardItemCtor({ [file.type]: blob });
          await navigator.clipboard.write([item]);
          toast.success("Image copied to clipboard");
          return;
        }
      }

      // Fallback: copy base64 data URL as text (many editors won't turn this into an image)
      const dataUrl: string = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dataUrl);
        toast.success("Image copied as base64 (fallback)");
        return;
      }

      toast.error("Copy not supported in this browser");
    } catch (err) {
      console.error("copy image error", err);
      toast.error(
        "Failed to copy image. Your browser may not support clipboard image writes."
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // IMPROVED: Better DnD handlers with visual feedback
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if leaving the drop zone completely
    const relatedTarget = e.relatedTarget as Node;
    if (!dropZoneRef.current?.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleNewFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, []);

  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const list = q
      ? mentionables.filter((m) => m.name.toLowerCase().includes(q))
      : mentionables;
    const list2 = q
      ? mentionsChannelUser.filter((m) => m.name.toLowerCase().includes(q))
      : mentionsChannelUser;
    return [...list.slice(0, 8), ...list2.slice(0, 8)];
  }, [mentionQuery, mentionables, mentionsChannelUser]);

  const openMentionIfNeeded = (val: string) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? val.length;
    const upto = val.slice(0, caret);
    const m = upto.match(/(^|\s)@([\w-]{0,32})$/);

    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[2] || "");
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const insertMention = (name: string) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? message.length;
    const upto = message.slice(0, caret);
    const rest = message.slice(caret);
    const upto2 = upto.replace(/@[^\s]*$/, "@");
    const next = `${upto2}${name} ${rest}`;
    setMessage(next);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleChange = (val: string) => {
    setMessage(val);
    openMentionIfNeeded(val);
  };

  // FIXED: Improved keydown handler with better shift+enter handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "ArrowDown")
          setMentionIndex((i) =>
            Math.min(i + 1, Math.max(mentionCandidates.length - 1, 0))
          );
        if (e.key === "ArrowUp") setMentionIndex((i) => Math.max(i - 1, 0));
        if (e.key === "Enter") {
          const chosen = mentionCandidates[mentionIndex];
          if (chosen) insertMention(chosen.name);
        }
        if (e.key === "Escape") setMentionOpen(false);
        return;
      }
    }

    // FIXED: Only prevent default for Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // FIXED: Submit logic - allow files-only submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Allow submission if there are files OR message is not empty
    const hasContent = message.trim().length > 0 || files.length > 0;
    if (!hasContent || isSubmitting || isUploading) return;
    if (!session?.user) return;

    setIsSubmitting(true);

    try {
      let uploadedFiles: UploadedFileData[] = [];
      if (files.length > 0) {
        uploadedFiles = await uploadFiles();
        if (!uploadedFiles.length) throw new Error("File upload failed");
      }

      // If replying to an attachment, append a hidden marker to content and include pinnedMessageId
      let sendContent = message.trim();
      if (replyAttachment) {
        try {
          const marker = JSON.stringify({
            messageId: replyAttachment.messageId,
            attachmentIndex: replyAttachment.attachmentIndex,
          });
          sendContent = `${sendContent}\n\n__ATTACH_REPLY__:${marker}`;
        } catch (err) {
          console.warn("Failed to encode reply attachment marker", err);
        }
      }

      const clientId = "c_" + Math.random().toString(36).slice(2, 10);
      const currentUser = session.user as any;
      const payload: any = {
        content: sendContent,
        channelId,
        receiverId,
        files: uploadedFiles,
        clientId,
      };
      if (pinned?.id) payload.pinnedMessageId = pinned.id;
      if (replyToMessage?.messageId)
        payload.replyToMessageId = replyToMessage.messageId;

      // Optimistically add a temporary message locally marked as 'sending'
      const tempMsg = {
        id: clientId,
        content: sendContent,
        senderId: currentUser.id,
        receiverId: receiverId || null,
        channelId: channelId || null,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          name: currentUser.name || "You",
          email: currentUser.email || "",
          image: currentUser.image || null,
        },
        status: "sending",
      } as any;
      window.dispatchEvent(
        new CustomEvent("message:received", { detail: tempMsg })
      );

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Reset form state
      setMessage("");
      setFiles([]);
      setPinned(null);
      setReplyAttachment(null);
      setReplyToMessage(null);
      onMessageSent?.();
      const sentMsg = await res.json();
      
      // Include clientId so real-time-messages can replace the optimistic message
      window.dispatchEvent(
        new CustomEvent("message:received", { detail: { ...sentMsg, clientId } })
      );
      window.dispatchEvent(
        new CustomEvent("message:status-update", {
          detail: { messageId: sentMsg.id, status: "sent" },
        })
      );
      toast.success("Message sent successfully");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload helper
  async function uploadFiles(): Promise<UploadedFileData[]> {
    if (files.length === 0) return [];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles: UploadedFileData[] = [];
      
      // Split files into small (<100MB) and large (>=100MB) categories
      const CHUNK_THRESHOLD = 100 * 1024 * 1024; // 100MB
      const smallFiles = files.filter(f => f.size < CHUNK_THRESHOLD);
      const largeFiles = files.filter(f => f.size >= CHUNK_THRESHOLD);

      // Upload small files normally (multipart)
      if (smallFiles.length > 0) {
        const formData = new FormData();
        smallFiles.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to upload small file(s)");
        const data = await response.json();
        uploadedFiles.push(...data.files.map((f: any, idx: number) => ({
          fileUrl: f.fileUrl,
          fileName: smallFiles[idx].name,
          fileType: smallFiles[idx].type,
        })));
      }

      // Upload large files using chunked upload
      for (const file of largeFiles) {
        const result = await uploadFileChunked(file);
        if (result) uploadedFiles.push(result);
      }

      setUploadProgress(100);
      return uploadedFiles;
    } catch (e) {
      console.error("upload error", e);
      toast.error("Failed to upload file(s). Please try again.");
      return [];
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  // Chunked upload for large files
  async function uploadFileChunked(file: File): Promise<UploadedFileData | null> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (reduced from 10MB to avoid truncation)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    console.log(`Uploading ${file.name} in ${totalChunks} chunks (${CHUNK_SIZE / 1024 / 1024}MB each)`);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("chunkIndex", String(i));
      formData.append("totalChunks", String(totalChunks));
      formData.append("fileId", fileId);
      formData.append("fileName", file.name);
      formData.append("fileType", file.type || "application/octet-stream");

      // Retry logic for failed chunks
      let retries = 3;
      let success = false;
      let lastError: any = null;

      while (retries > 0 && !success) {
        try {
          const response = await fetch("/api/upload/chunk", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          success = true;

          // Update progress
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setUploadProgress(progress);

          if (data.complete && data.files && data.files[0]) {
            console.log(`${file.name} uploaded successfully`);
            return {
              fileUrl: data.files[0].fileUrl,
              fileName: file.name,
              fileType: file.type,
            };
          }
        } catch (error) {
          lastError = error;
          retries--;
          if (retries > 0) {
            console.warn(`Chunk ${i + 1}/${totalChunks} failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      if (!success) {
        toast.error(`Failed to upload chunk ${i + 1}/${totalChunks} of ${file.name} after 3 attempts`);
        console.error('Chunk upload failed:', lastError);
        return null;
      }
    }

    return null;
  }

  const handleBuzz = async () => {
    if (isBuzzing || isSubmitting || isUploading) return;
    if (!session?.user) return;
    if (!channelId && !receiverId) {
      toast.error("Select a channel or user to buzz.");
      return;
    }

    setIsBuzzing(true);
    try {
      let ok = false;
      if (isConnected && sendBuzz) {
        ok = await sendBuzz({ channelId, receiverId });
      }
      if (!ok) {
        const res = await fetch("/api/buzz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId, receiverId }),
        });
        if (res.status === 429) throw new Error("Rate limited");
        ok = res.ok;
      }
      if (ok) toast.success("Buzz sent 🚀");
      else throw new Error("Failed");
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.message === "Rate limited"
          ? "Too many buzzes. Try later."
          : "Couldn't buzz. Try again."
      );
    } finally {
      setIsBuzzing(false);
    }
  };

  // FIXED: Check if we have content to enable submit button
  const hasContent = message.trim().length > 0 || files.length > 0;

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 border-t border-gray-300 dark:border-gray-600 relative transition-all duration-200 min-h-[70px] sm:min-h-[80px]",
        isDragging && "ring-4 ring-green-500 bg-green-100 dark:bg-green-900/30 ring-opacity-50"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* IMPROVED: Better drag overlay with more space */}
      {isDragging && (
        <div className="absolute inset-0 bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center z-50 rounded-lg border-4 border-dashed border-green-500 border-opacity-70">
          <div className="text-center p-4 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-300 dark:border-green-600 mx-2">
            <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-green-500 mx-auto mb-2 sm:mb-4" />
            <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
              Drop files to upload
            </p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Release files anywhere in this area
            </p>
          </div>
        </div>
      )}

      {/* IMPROVED: Better spacing for pinned and reply messages */}
      <div className="space-y-2 sm:space-y-3 mb-2 sm:mb-4">
        {/* {pinned && (
          <div className="flex items-start gap-3 rounded-lg bg-white dark:bg-gray-700 p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <AtSign className="h-5 w-5 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Pinned reference
              </div>
              <div className="text-base text-gray-900 dark:text-white break-words">
                <span className="font-semibold">
                  {pinned.author ? pinned.author + ": " : ""}
                </span>
                {pinned.preview}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
              onClick={() => setPinned(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )} */}

        {replyToMessage && (
          <div className="flex items-start gap-2 sm:gap-3 rounded-lg bg-white dark:bg-gray-700 p-2 sm:p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">
                Replying to {replyToMessage.senderName ?? "message"}
              </div>
              <div className="text-sm sm:text-base text-gray-900 dark:text-white break-words line-clamp-2">
                {replyToMessage.preview ?? ""}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
              onClick={() => {
                setReplyToMessage(null);
                setPinned(null);
              }}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* IMPROVED: Better file previews with more space */}
      {files.length > 0 && (
        <div className="mb-2 sm:mb-4 p-2 sm:p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {files.length} file{files.length > 1 ? "s" : ""} •{" "}
              <span className="hidden xs:inline">{formatBytes(files.reduce((sum, f) => sum + f.size, 0))}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border-gray-300 dark:border-gray-600"
              onClick={() => setFiles([])}
              disabled={isUploading || isSubmitting}
            >
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3 max-h-[150px] sm:max-h-[200px] overflow-y-auto">
            {files.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");
              const isAudio = file.type.startsWith("audio/");
              return (
                <div key={index} className="relative group">
                  <div className="flex items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 hover:border-gray-300 dark:hover:border-gray-400 transition-colors">
                    <div className="mr-2 sm:mr-3 flex-shrink-0">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previews[index]}
                          alt={file.name}
                          className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded border border-gray-200 dark:border-gray-500"
                          onCopy={(e) => {
                            e.preventDefault();
                            copyImage(index);
                          }}
                        />
                      ) : isVideo ? (
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                          <Video className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : isAudio ? (
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center">
                          <Music className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 dark:bg-gray-500 rounded flex items-center justify-center">
                          <File className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[150px]"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span className="block text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 sm:ml-2 h-6 w-6 sm:h-7 sm:w-7 p-0 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={() => removeFile(index)}
                      disabled={isUploading || isSubmitting}
                    >
                      <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Uploading files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress
                value={uploadProgress}
                className="h-2 bg-gray-200 dark:bg-gray-600"
              />
            </div>
          )}
        </div>
      )}

      {/* IMPROVED: Better form layout with more spacing */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 sm:gap-3"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.zip,.mp3,svg,.gif,.csv,.json,.xml,.xlsx,exe,.apk,.dmg,.iso,.rar,.7z,.tar,.gz,.psd,.ai,.ttf,.otf,
          .epub,.mobi,.vcf,.vcf,.xlsm,.pages,.key,.numbers,.odt,.ods,.odp,.rtf,.wav,.flac,.aac,.ogg,.wma,.m4a,.mov,.wmv,.flv,.3gp,.m4v,.avchd,.ts,.mts,.m2ts,.vob,.divx,.asf,.rmvb,.mpeg,.mpg,.mpeg,.mpe,.qt,.f4v,.rm,.xvid,
          .cab,.bin,.cue,.toast,.vcd,.iso,.mdf,.nrg,.uue,.xxe,.zipx,.rar,.alz,.arc,.arj,.bz2,.bzip2,.cab,.cpio,.gz,.lzh,.lzma,.lzo,.rz,.sfark,.szip,.tar,.tbz2,.tgz,.txz,.xz,.z,.zoo,.zst,spl,sit,.sitx,"
        />

        {/* IMPROVED: WhatsApp-style Input Container with better spacing */}
        <div className="flex-1 flex items-center bg-white dark:bg-gray-700 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || isUploading}
            className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
            title="Attach files"
          >
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Emoji Picker - Hidden on very small screens */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="hidden xs:flex h-8 w-8 sm:h-10 sm:w-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                title="Add emoji"
              >
                <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none" align="start">
              <EmojiPicker onEmojiClick={handleEmojiClick} width={Math.min(350, window.innerWidth - 32)} height={350} />
            </PopoverContent>
          </Popover>

          {/* AI Rewriter - Hidden on mobile */}
          <div className="hidden sm:block">
            <MessageRewriter
              message={message}
              onApply={(rewritten) => setMessage(rewritten)}
              disabled={isSubmitting || isUploading}
            />
          </div>

        
          {/* Message Input */}
          <div className="flex-1 relative mx-1 sm:mx-3" ref={wrapperRef}>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                if (mentionOpen) {
                  if (
                    ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)
                  ) {
                    e.preventDefault();
                    if (e.key === "ArrowDown")
                      setMentionIndex((i) =>
                        Math.min(
                          i + 1,
                          Math.max(mentionCandidates.length - 1, 0)
                        )
                      );
                    if (e.key === "ArrowUp")
                      setMentionIndex((i) => Math.max(i - 1, 0));
                    if (e.key === "Enter") {
                      const chosen = mentionCandidates[mentionIndex];
                      if (chosen) insertMention(chosen.name);
                    }
                    if (e.key === "Escape") setMentionOpen(false);
                    return;
                  }
                }

                if (e.key === "Enter" && e.shiftKey) {
                  return;
                }

                // Send message on Enter (including when only files are attached)
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const hasContent = message.trim().length > 0 || files.length > 0;
                  if (hasContent && !isSubmitting && !isUploading) {
                    handleSubmit();
                  }
                }
              }}
              placeholder="Type a message..."
              className="min-h-[36px] sm:min-h-[40px] max-h-[100px] sm:max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base leading-relaxed"
              disabled={isSubmitting || isUploading}
              rows={1}
            />

            {mentionOpen && mentionCandidates.length > 0 && (
              <div className="absolute left-0 bottom-12 sm:bottom-14 z-20 w-60 sm:w-72 max-h-48 sm:max-h-64 overflow-auto rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
                {mentionCandidates.map((m, i) => (
                  <button
                    type="button"
                    key={m.type + m.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m.name);
                    }}
                    className={cn(
                      "w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg sm:first:rounded-t-xl last:rounded-b-lg sm:last:rounded-b-xl",
                      i === mentionIndex && "bg-gray-100 dark:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                          {m.name}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {m.type}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

          </div>
          
           <Button type="button" variant="secondary" size="icon" title="Buzz"
             className="hidden sm:flex h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
           onClick={handleBuzz} disabled={isSubmitting || isUploading || isBuzzing}>
            {isBuzzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          </Button>
            <Button
          type="submit"
          disabled={!hasContent || isSubmitting || isUploading}
          size="icon"
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full mx-4 bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
          title="Send message"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>
        </div>


        {/* IMPROVED: Send Button with better styling */}
      
      </form>

      {/* IMPROVED: Better help text - Hidden on mobile */}
     
    </div>
  );
}