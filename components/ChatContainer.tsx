"use client"
import { useCallback, useState } from "react"
import MessageList from "./message-list"
import MessageInput from "./message-input"
import { useSession } from "next-auth/react"
import type { Message } from "./types" // Make sure you have proper types

export default function ChatContainer() {

  const [messages, setMessages] = useState<Message[]>([])


   const [replyingTo, setReplyingTo] = useState<{
    id: string
    content: string
    sender: {
      id: string
      name: string
    }
  } | null>(null)
  const { data: session } = useSession()

  console.log("ChatContainer replyingTo state:", replyingTo)


const handleReplySelect = (message: any) => {
  console.log("Replying to:", message.id);
  setReplyingTo(message); 
};
  const handleReplySubmit = async (content: string, replyToId: string) => {
    if (!session?.user?.id) return
    
    try {
      console.log("Sending reply:", { content, replyToId }) // Debug log
      
      // Here you would typically call your API
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          replyToId,
          senderId: session.user.id,
          // Add other required fields aata hai ki
        }),
      })

      if (!response.ok) throw new Error("Failed to send reply")
      
      const newMessage = await response.json()
      setMessages(prev => [...prev, newMessage])
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending reply:", error)
    }
  }



  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
       <MessageList onReplySelect={handleReplySelect} currentUserId={session?.user?.id} />
      </div>
  <MessageInput  replyingTo={replyingTo} key={replyingTo?.id || 'default'} />
        </div>
  )
}






