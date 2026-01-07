"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type DescriptionGeneratorProps = {
  title: string
  onGenerate: (description: string) => void
  type?: "project" | "task" | "channel"
  disabled?: boolean
  size?: "default" | "sm" | "lg" | "icon"
}

export function DescriptionGenerator({
  title,
  onGenerate,
  type = "project",
  disabled,
  size = "sm",
}: DescriptionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error(`Please enter a ${type} title first`)
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type }),
      })

      if (!response.ok) throw new Error("Failed to generate description")

      const data = await response.json()
      onGenerate(data.description)
      toast.success("Description generated successfully! ✨")
    } catch (error) {
      console.error("Error generating description:", error)
      toast.error("Failed to generate description")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleGenerate}
      disabled={disabled || isGenerating || !title.trim()}
      className="gap-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          AI Generate
        </>
      )}
    </Button>
  )
}
