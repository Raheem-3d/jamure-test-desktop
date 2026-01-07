"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Smile } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import EmojiPicker from "emoji-picker-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSocket } from "@/lib/socket-client"
import { useSession } from "next-auth/react"

type TaskCommentsProps = {
  taskId: string
  comments: any[]
}

export default function TaskComments({ taskId, comments: initialComments }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState(initialComments)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const { socket, isConnected, sendTaskUpdate } = useSocket()

  useEffect(() => {
    // Update comments when initialComments changes
    setComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    // Scroll to bottom when new comments arrive
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  useEffect(() => {
    if (!isConnected || !socket) return

    // Listen for task updates
    const handleTaskUpdate = (updatedTask: any) => {
      if (updatedTask.id === taskId && updatedTask.comments) {
        setComments(updatedTask.comments)
      }
    }

    socket.on("task-updated", handleTaskUpdate)

    return () => {
      socket.off("task-updated", handleTaskUpdate)
    }
  }, [isConnected, socket, taskId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [newComment])

  const handleEmojiClick = (emojiData: any) => {
    setNewComment((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/task-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment,
          taskId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add comment")
      }

      const newCommentData = await response.json()

      // Update local comments
      setComments((prev) => [newCommentData, ...prev])

      // Send task update via socket
      if (session?.user?.id) {
        sendTaskUpdate({
          id: taskId,
          comments: [newCommentData, ...comments],
        })
      }

      setNewComment("")
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully",
      })

      // Force a refresh to show the new comment
      router.refresh()
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="pr-10 resize-none focus:border-blue-500 focus:ring-blue-500"
          />
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute right-2 bottom-2" type="button">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none" align="end">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!newComment.trim() || isSubmitting}>
            {isSubmitting ? (
              "Adding..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
          ) : (
            comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="border rounded-lg p-4 bg-white"
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.user.image || ""} alt={comment.user.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {comment.user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{comment.user.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={commentsEndRef} />
      </div>
    </div>
  )
}
