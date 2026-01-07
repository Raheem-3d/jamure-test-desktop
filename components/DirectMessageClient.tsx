
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import RealTimeMessages from "@/components/real-time-messages";
import MessageInput from "@/components/message-input";
import { useSocket } from "@/hooks/use-socket";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Search,
  Paperclip,
  Smile,
  Mic
} from "lucide-react";

type Mentionable = {
  id: string;
  name: string;
  type: "user" | "channel";
  avatarUrl?: string | null;
};

export default function DirectMessageClient({
  recipient,
  messages,
  channelId,
}: any) {
  const { onlineUsers } = useSocket();
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const isOnline = onlineUsers.includes(recipient?.id);

  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("lastSeenMap");
    return stored ? JSON.parse(stored) : {};
  });

  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);

  useEffect(() => {
    let abort = false;
    async function loadMentionables() {
      setLoadingMentions(true);

      try {
        if (channelId) {
          const res = await fetch(
            `/api/messages/mentionables?receiverId=${encodeURIComponent(
              channelId
            )}`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error("Failed to load mentionables");
          const data = await res.json();
          console.log("Fetching mentionables for DM:", data);

          if (!abort) setMentionables(data.mentionables ?? []);
        }
        if (recipient) {
          const res = await fetch(
            `/api/messages/mentionables?receiverId=${encodeURIComponent(
              recipient.id
            )}`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error("Failed to load mentionables");
          const data = await res.json();
          console.log("Fetching mentionables for DM:", data);

          if (!abort) setMentionables(data.mentionables ?? []);
        }
      } catch (e) {
        console.error(e);
        if (!abort) {
          setMentionables([
            {
              id: recipient.id,
              name: recipient.name ?? "User",
              type: "user",
              avatarUrl: recipient.image ?? null,
            },
          ]);
        }
      } finally {
        if (!abort) setLoadingMentions(false);
      }
    }
    if (recipient?.id) loadMentionables();
    return () => {
      abort = true;
    };
  }, [recipient?.id, recipient?.name, recipient?.image]);

  useEffect(() => {
    const storedMap = localStorage.getItem("lastSeenMap");
    let initialLastSeen: string | null = null;

    if (storedMap) {
      try {
        const parsedMap = JSON.parse(storedMap);
        initialLastSeen = parsedMap[recipient.id] || null;
      } catch (e) {
        console.error("Error parsing lastSeenMap", e);
      }
    }

    if (!isOnline && lastSeenMap[recipient.id]) {
      const newLastSeenDate = new Date(lastSeenMap[recipient.id]);
      const storedLastSeenDate = initialLastSeen
        ? new Date(initialLastSeen)
        : null;
      if (!storedLastSeenDate || newLastSeenDate > storedLastSeenDate) {
        initialLastSeen = lastSeenMap[recipient.id];
      }
    }

    setLastSeen(initialLastSeen);

    if (initialLastSeen) {
      const currentMap = storedMap ? JSON.parse(storedMap) : {};
      localStorage.setItem(
        "lastSeenMap",
        JSON.stringify({ ...currentMap, [recipient.id]: initialLastSeen })
      );
    }
  }, [recipient.id, isOnline, lastSeenMap]);

  const lastSeenText = lastSeen
    ? formatDistanceToNow(new Date(lastSeen), {
        addSuffix: true,
        includeSeconds: false,
      })
    : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header - WhatsApp Style */}
      <div className="px-4 py-3 bg-green-600 dark:bg-gray-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage
              src={recipient.image || ""}
              alt={recipient.name || ""}
            />
            <AvatarFallback className="bg-white/20 text-white">
              {recipient.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="font-semibold text-white text-lg">
              {recipient.name}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-white/90 text-xs">
                {isOnline ? "Online" : lastSeenText ? `Last seen ${lastSeenText}` : "Offline"}
              </span>
              {recipient.department && (
                <Badge
                  variant="outline"
                  className="bg-white/20 text-white border-white/30 text-xs"
                >
                  {recipient.department.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Header Actions */}
       
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800">
        <RealTimeMessages
          initialMessages={messages}
          receiverId={recipient.id}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Input Area - WhatsApp Style */}
      <div className="bg-gray-100 dark:bg-gray-800 p-3 border-t border-gray-300 dark:border-gray-600">
        <div className="flex items-center space-x-2">
   
          
          {/* Message Input */}
          <div className="flex-1">
            <MessageInput
              channelId={undefined}
              receiverId={recipient.id}
              mentionables={mentionables}
            />
          </div>
          
        
        </div>
      </div>
    </div>
  );
}



