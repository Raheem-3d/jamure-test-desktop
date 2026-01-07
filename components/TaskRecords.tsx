"use client"

import { useState } from "react"
import type { Task, Tag, User, Stage } from "@/types/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Filter, MoreHorizontal, Calendar, TagIcon } from "lucide-react"
import { formatDate } from "date-fns"

interface TaskRecordsProps {
  tasks: Task[]
  tags: Tag[]
  users: User[]
  stages: Stage[]
  onTaskClick: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function TaskRecords({ stages, tasks, tags, users, onTaskClick, onDeleteTask }: TaskRecordsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPriority, setSelectedPriority] = useState<string>("")



  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTags = selectedTags.length === 0 || task.tags.some((tag) => selectedTags.includes(tag.id))

    const matchesPriority = !selectedPriority || task.priority === selectedPriority

    return matchesSearch && matchesTags && matchesPriority
  })






  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-cyan-400 dark:via-blue-500 dark:to-purple-600 dark:bg-clip-text drop-shadow-lg">
            All Records
          </h2>
          <Badge variant="secondary" className="px-4 py-1.5 dark:bg-gradient-to-br dark:from-indigo-600 dark:to-purple-700 dark:text-white dark:border-0 dark:shadow-xl dark:shadow-purple-500/40 font-semibold">
            {filteredTasks.length} tasks
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-indigo-400 dark:group-hover:text-cyan-400 transition-colors duration-300" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-2.5 w-80 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-indigo-950 dark:border-indigo-500/40 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-cyan-500 dark:focus:ring-2 dark:focus:ring-cyan-500/30 dark:shadow-2xl dark:shadow-indigo-500/20 transition-all duration-300 rounded-xl"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-5 py-2.5 dark:bg-gradient-to-br dark:from-indigo-600 dark:to-purple-700 dark:border-0 dark:text-white dark:hover:from-indigo-500 dark:hover:to-purple-600 dark:shadow-xl dark:shadow-indigo-500/30 dark:hover:shadow-2xl dark:hover:shadow-indigo-500/50 dark:hover:scale-105 transition-all duration-300 rounded-xl font-semibold">
                <TagIcon className="h-4 w-4 mr-2" />
                Tags
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 dark:border-indigo-500/30 dark:shadow-2xl dark:shadow-purple-500/40 dark:backdrop-blur-xl rounded-xl p-2">
              {tags.map((tag) => (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                    )
                  }}
                  className="dark:text-slate-200 dark:hover:bg-gradient-to-r dark:hover:from-indigo-700/50 dark:hover:to-purple-700/50 dark:hover:text-white cursor-pointer transition-all duration-200 rounded-lg my-1 px-3 py-2"
                >
                  <Badge className={`mr-2 ${tag.color}`}>{tag.name}</Badge>
                  {selectedTags.includes(tag.id) && <span className="ml-auto text-cyan-400 font-bold">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-5 py-2.5 dark:bg-gradient-to-br dark:from-purple-600 dark:to-pink-600 dark:border-0 dark:text-white dark:hover:from-purple-500 dark:hover:to-pink-500 dark:shadow-xl dark:shadow-purple-500/30 dark:hover:shadow-2xl dark:hover:shadow-purple-500/50 dark:hover:scale-105 transition-all duration-300 rounded-xl font-semibold">
                <Filter className="h-4 w-4 mr-2" />
                Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 dark:border-indigo-500/30 dark:shadow-2xl dark:shadow-purple-500/40 dark:backdrop-blur-xl rounded-xl p-2">
              <DropdownMenuItem onClick={() => setSelectedPriority("")} className="dark:text-slate-200 dark:hover:bg-gradient-to-r dark:hover:from-indigo-700/50 dark:hover:to-purple-700/50 dark:hover:text-white cursor-pointer transition-all duration-200 rounded-lg my-1 px-3 py-2">
                All Priorities
                {!selectedPriority && <span className="ml-auto text-cyan-400 font-bold">✓</span>}
              </DropdownMenuItem>
              {["urgent", "high", "medium", "low"].map((priority) => (
                <DropdownMenuItem key={priority} onClick={() => setSelectedPriority(priority)} className="dark:text-slate-200 dark:hover:bg-gradient-to-r dark:hover:from-indigo-700/50 dark:hover:to-purple-700/50 dark:hover:text-white cursor-pointer transition-all duration-200 rounded-lg my-1 px-3 py-2">
                  <Badge className={`mr-2 ${getPriorityColor(priority)}`}>{priority}</Badge>
                  {selectedPriority === priority && <span className="ml-auto text-cyan-400 font-bold">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-2xl w-full overflow-hidden dark:border-indigo-500/20 dark:bg-gradient-to-br dark:from-slate-900/80 dark:via-indigo-950/50 dark:to-slate-900/80 dark:shadow-2xl dark:shadow-indigo-500/20 dark:backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-indigo-500/20 dark:bg-gradient-to-r dark:from-indigo-900/50 dark:via-purple-900/50 dark:to-indigo-900/50 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/60 border-b-2">
              <TableHead className="dark:text-cyan-300 font-bold text-base py-4">Task</TableHead>
              <TableHead className="dark:text-cyan-300 font-bold text-base py-4">Stage</TableHead>
              {/* <TableHead>Priority</TableHead> */}
              <TableHead className="dark:text-cyan-300 font-bold text-base py-4">Assignee</TableHead>
              <TableHead className="dark:text-cyan-300 font-bold text-base py-4">Due Date</TableHead>
              <TableHead className="dark:text-cyan-300 font-bold text-base py-4">Tags</TableHead>
              <TableHead className="w-[50px] dark:text-cyan-300"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow 
                key={task.id} 
                className="cursor-pointer hover:bg-gray-50 dark:border-indigo-500/10 dark:hover:bg-gradient-to-r dark:hover:from-indigo-900/30 dark:hover:via-purple-900/20 dark:hover:to-indigo-900/30 transition-all duration-300 dark:hover:shadow-xl dark:hover:shadow-purple-500/20 dark:hover:scale-[1.01] dark:hover:border-l-4 dark:hover:border-l-cyan-500" 
                onClick={() => onTaskClick(task)}
              >
                <TableCell className="dark:text-slate-100 py-4">
                  <div>
                    <div className="font-semibold dark:text-white text-base dark:drop-shadow-lg">{task.title}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs mt-1">{task.description}</div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  {stages.find((stage: Stage) => stage.id === task.stageId)?.name ? (
                    <Badge variant="destructive" className="w-full dark:bg-gradient-to-br dark:from-red-600 dark:to-rose-700 dark:border-0 dark:shadow-xl dark:shadow-red-500/30 font-semibold px-3 py-1.5">
                      <div className="items-center w-fit">
                        {stages.find((stage: Stage) => stage.id === task.stageId)?.name}
                      </div>
                    </Badge>
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500 italic">No stage</span>
                  )}
                </TableCell>
                {/* <TableCell>
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                </TableCell> */}
                <TableCell className="py-4">
                  {task.assignees ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-slate-200 dark:ring-cyan-500/50 dark:ring-offset-2 dark:ring-offset-slate-900 transition-all duration-300 dark:hover:ring-cyan-400 dark:hover:scale-110">
                        <AvatarImage src={task.assignees.avatar || "/placeholder.svg"} alt={task.assignees.name} />
                        <AvatarFallback className="text-xs font-bold dark:bg-gradient-to-br dark:from-cyan-500 dark:to-blue-600 dark:text-white dark:shadow-lg">
                          {task.assignees.name ? task.assignees.name.split(" ").map((n: string) => n[0]).join("") : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium dark:text-slate-100">{task.assignees.name || "Unknown"}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="w-32 py-4">
                  {task.dueDate ? (
                    <div className="flex items-center gap-2 w-[160px] px-3 py-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-indigo-600/40 dark:via-blue-600/30 dark:to-cyan-600/40 dark:border dark:border-cyan-500/30 dark:shadow-lg dark:shadow-cyan-500/20 transition-all duration-300 dark:hover:shadow-xl dark:hover:shadow-cyan-500/40">
                      <Calendar className="h-5 w-5 text-blue-500 dark:text-cyan-300" />
                      <div className="flex flex-col">
                        <span className="text-xs text-blue-700 dark:text-cyan-200 font-bold">
                          {formatDate(task.dueDate, "MMM dd, yyyy")}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-cyan-400/80 font-medium">
                          {task.dueDate < new Date() ? "⚠ Overdue" : "📅 Due soon"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500 italic">No due date</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-wrap gap-2">
                    {task.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} className={`text-xs font-semibold px-3 py-1 ${tag.color} dark:shadow-lg dark:shadow-purple-500/20 transition-all duration-300 dark:hover:scale-105`}>
                        {tag.name}
                      </Badge>
                    ))}
                    {task.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs font-semibold px-2 dark:bg-indigo-900/50 dark:border-indigo-500/50 dark:text-indigo-300 dark:hover:bg-indigo-800/70 transition-all">
                        +{task.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 dark:text-slate-300 dark:hover:bg-gradient-to-br dark:hover:from-indigo-700/50 dark:hover:to-purple-700/50 dark:hover:text-white transition-all duration-300 dark:hover:scale-110 rounded-xl">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 dark:border-indigo-500/30 dark:shadow-2xl dark:shadow-purple-500/40 dark:backdrop-blur-xl rounded-xl p-2">
                      <DropdownMenuItem onClick={() => onTaskClick(task)} className="dark:text-slate-200 dark:hover:bg-gradient-to-r dark:hover:from-indigo-700/50 dark:hover:to-purple-700/50 dark:hover:text-white cursor-pointer transition-all duration-200 rounded-lg px-3 py-2 font-medium">
                        👁️ View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteTask(task.id)
                        }}
                        className="text-red-600 dark:text-red-400 dark:hover:bg-gradient-to-r dark:hover:from-red-700/50 dark:hover:to-rose-700/50 dark:hover:text-red-300 cursor-pointer transition-all duration-200 rounded-lg px-3 py-2 font-medium"
                      >
                        🗑️ Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

