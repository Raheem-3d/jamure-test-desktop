

"use client"
import type { Stage, Task } from "@/types/task"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MessageSquare, Paperclip, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"


interface TaskCardProps {
  task: Task
  onClick: () => void
  isComplete?: boolean
  showCompleteButton?: boolean
  onComplete?: (taskId: string) => Promise<void>
  isCompleting?: boolean
  stages: Stage[] // Add stages to props
}

export function TaskCard({ 
  task, 
  onClick, 
  isComplete = false,
  showCompleteButton = false,
  onComplete,
  isCompleting = false,
  stages = []
}: TaskCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-950/50 dark:to-rose-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/50 shadow-sm dark:shadow-red-500/20"
      case "high":
        return "bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-500/50 shadow-sm dark:shadow-orange-500/20"
      case "medium":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/50 shadow-sm dark:shadow-yellow-500/20"
      case "low":
        return "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/50 shadow-sm dark:shadow-green-500/20"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600 shadow-sm"
    }
  }
  
  const handleCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (onComplete) {
        await onComplete(task.id)
        // No need to manually update UI here - parent component should handle it
      }
    } catch (error) {
      toast.error("Failed to complete task")
      console.error("Error completing task:", error)
    }
  }




  const getNextStageName = () => {
    const currentStageIndex = stages.findIndex(s => s.id === task.stageId)
    if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
      return null
    }
    const nextStage = stages[currentStageIndex + 1]
    return nextStage?.name || null
  }

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900/90 rounded-xl border border-gray-200 dark:border-slate-700/50 p-4 cursor-pointer hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-purple-500/10 transition-all duration-300 hover:scale-[1.02] dark:hover:border-purple-500/30",
        isComplete && "bg-green-50 dark:bg-gradient-to-br dark:from-green-950/30 dark:to-emerald-950/20 border-green-200 dark:border-green-500/40"
      )}
      onClick={onClick}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 dark:group-hover:from-blue-500/5 dark:group-hover:via-purple-500/5 dark:group-hover:to-pink-500/5 rounded-xl transition-all duration-300 pointer-events-none"></div>
      
      {/* Completion badge */}
      {isComplete && (
        <Badge className="relative z-10 mb-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/50 shadow-sm dark:shadow-green-500/20">
          Completed
        </Badge>
      )}

      <div className="relative z-10 flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {task.title}
        </h4>
        <Badge className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="relative z-10 text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="relative z-10 flex flex-wrap gap-1.5 mb-3">
        {task.tags.map((tag) => (
          <Badge key={tag.id} className={`text-xs font-medium ${tag.color} dark:shadow-sm transition-all hover:scale-105`}>
            {tag.name}
          </Badge>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 dark:bg-slate-700/50 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700">
              <Calendar className="h-3 w-3 text-blue-500 dark:text-blue-400" />
              <span>{formatDistanceToNow(task.dueDate, { addSuffix: true })}</span>
            </div>
          )}

          {task.comments?.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 dark:bg-slate-700/50 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700">
              <MessageSquare className="h-3 w-3 text-purple-500 dark:text-purple-400" />
              <span>{task.comments.length}</span>
            </div>
          )}

          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 dark:bg-slate-700/50 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700">
              <Paperclip className="h-3 w-3 text-pink-500 dark:text-pink-400" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {task.assignees && (
          <div className="relative group/avatar">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-0 group-hover/avatar:opacity-100 blur transition-opacity"></div>
            <Avatar className="relative h-6 w-6 ring-2 ring-white dark:ring-slate-700 transition-transform group-hover/avatar:scale-110">
              <AvatarImage 
                src={task.assignees.avatar || "/placeholder.svg"} 
                alt={task.assignees.name} 
              />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {task.assignees.name
                  ? task.assignees.name.split(" ").map((n: string) => n[0]).join("")
                  : "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Complete button (shown conditionally) */}
      {showCompleteButton && (
        <div className="relative z-10 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full group/btn relative overflow-hidden text-green-600 dark:text-green-400 hover:text-white dark:hover:text-white border-green-200 dark:border-green-500/50 hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 dark:bg-green-950/20 dark:hover:bg-gradient-to-r dark:hover:from-green-600 dark:hover:to-emerald-600 dark:shadow-lg dark:hover:shadow-green-500/30"
            onClick={handleCompleteClick}
            disabled={isCompleting}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
            <CheckCircle className="relative h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
            <span className="relative">
              {isCompleting ? "Moving..." : `Mark Complete (→ ${getNextStageName()})`}
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}
