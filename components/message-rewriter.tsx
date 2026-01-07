"use client"

import { useState } from "react"
import { Sparkles, Loader2, Copy, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type MessageRewriterProps = {
  message: string
  onApply: (rewritten: string) => void
  disabled?: boolean
}

const tones = [
  { value: "professional", label: "Professional", icon: "💼" },
  { value: "friendly", label: "Friendly", icon: "😊" },
  { value: "formal", label: "Formal", icon: "🎩" },
  { value: "casual", label: "Casual", icon: "👋" },
  { value: "concise", label: "Shorter", icon: "📝" },
  { value: "detailed", label: "Detailed", icon: "📋" },
]

export function MessageRewriter({ message, onApply, disabled }: MessageRewriterProps) {
  const [open, setOpen] = useState(false)
  const [tone, setTone] = useState("professional")
  const [rewritten, setRewritten] = useState("")
  const [isRewriting, setIsRewriting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRewrite = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message first")
      return
    }

    setIsRewriting(true)
    try {
      const response = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, tone }),
      })

      if (!response.ok) throw new Error("Failed to rewrite message")

      const data = await response.json()
      setRewritten(data.rewritten)
      toast.success(`Message rewritten in ${data.tone} tone!`)
    } catch (error) {
      console.error("Error rewriting message:", error)
      toast.error("Failed to rewrite message")
    } finally {
      setIsRewriting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rewritten)
    setCopied(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = () => {
    onApply(rewritten)
    setOpen(false)
    setRewritten("")
    toast.success("Message updated!")
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setRewritten("")
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !message.trim()}
          className="h-10 w-10 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
          title="AI Rewrite Message"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Message Rewriter
          </DialogTitle>
          <DialogDescription>
            Improve your message with AI. Choose a tone and click rewrite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Message */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Original Message
            </label>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {message}
              </p>
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Select Tone
            </label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a tone" />
              </SelectTrigger>
              <SelectContent>
                {tones.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rewrite Button */}
          <Button
            onClick={handleRewrite}
            disabled={isRewriting || !message.trim()}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
          >
            {isRewriting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rewriting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rewrite Message
              </>
            )}
          </Button>

          {/* Rewritten Message */}
          {rewritten && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  AI Rewritten Message
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {rewritten}
                </p>
              </div>

              {/* Apply Button */}
              <Button
                onClick={handleApply}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Apply This Version
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
