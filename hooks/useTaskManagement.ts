"use client"

import { useState, useCallback } from "react"
import type { Task, Stage, ActivityLog, Tag, User } from "@/types/task"

// Mock data
const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Developer",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Designer",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@example.com",
    role: "Manager",
    avatar: "/placeholder.svg?height=32&width=32",
  },
]

const mockTags: Tag[] = [
  { id: "1", name: "Frontend", color: "bg-blue-100 text-blue-800" },
  { id: "2", name: "Backend", color: "bg-green-100 text-green-800" },
  { id: "3", name: "Design", color: "bg-purple-100 text-purple-800" },
  { id: "4", name: "Bug", color: "bg-red-100 text-red-800" },
  { id: "5", name: "Feature", color: "bg-yellow-100 text-yellow-800" },
]

const initialStages: Stage[] = [
  {
    id: "1",
    name: "Backlog",
    color: "bg-gray-100",
    order: 1,
    isCompleted: false,
    nextStageId: "2",
    assignedTeam: "Planning",
    tasks: [],
  },
  {
    id: "2",
    name: "In Progress",
    color: "bg-blue-100",
    order: 2,
    isCompleted: false,
    nextStageId: "3",
    assignedTeam: "Development",
    tasks: [],
  },
  {
    id: "3",
    name: "Review",
    color: "bg-yellow-100",
    order: 3,
    isCompleted: false,
    nextStageId: "4",
    assignedTeam: "QA",
    tasks: [],
  },
  { id: "4", name: "Done", color: "bg-green-100", order: 4, isCompleted: true, assignedTeam: "Deployment", tasks: [] },
]

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Implement user authentication",
    description: "Add login and registration functionality",
    status: "active",
    priority: "high",
    assignee: mockUsers[0],
    dueDate: new Date("2024-01-15"),
    tags: [mockTags[0], mockTags[1]],
    stageId: "1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    comments: [],
    attachments: [],
  },
  {
    id: "2",
    title: "Design dashboard UI",
    description: "Create wireframes and mockups for the main dashboard",
    status: "active",
    priority: "medium",
    assignee: mockUsers[1],
    dueDate: new Date("2024-01-20"),
    tags: [mockTags[2]],
    stageId: "2",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
    comments: [],
    attachments: [],
  },
  {
    id: "3",
    title: "Fix navigation bug",
    description: "Navigation menu not working on mobile devices",
    status: "active",
    priority: "urgent",
    assignee: mockUsers[0],
    dueDate: new Date("2024-01-12"),
    tags: [mockTags[3], mockTags[0]],
    stageId: "3",
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-03"),
    comments: [],
    attachments: [],
  },
]

export function useTaskManagement() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [view, setView] = useState<"board" | "records">("board")

  // Organize tasks by stage
  const tasksByStage = stages.reduce(
    (acc, stage) => {
      acc[stage.id] = tasks.filter((task) => task.stageId === stage.id)
      return acc
    },
    {} as Record<string, Task[]>,
  )

  const addActivityLog = useCallback((log: Omit<ActivityLog, "id" | "timestamp">) => {
    const newLog: ActivityLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    setActivityLog((prev) => [newLog, ...prev])
  }, [])

  const createTask = useCallback(
    (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "attachments">) => {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
        attachments: [],
      }

      setTasks((prev) => [...prev, newTask])
      addActivityLog({
        type: "task_created",
        description: `Created task "${newTask.title}"`,
        user: mockUsers[0], // Current user
        taskId: newTask.id,
      })
    },
    [addActivityLog],
  )



  const updateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task)),
      )

      addActivityLog({
        type: "task_updated",
        description: `Updated task`,
        user: mockUsers[0],
        taskId,
      })
    },
    [addActivityLog],
  )

  const moveTask = useCallback(
    (taskId: string, newStageId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      const newStage = stages.find((s) => s.id === newStageId)
      if (!newStage) return

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, stageId: newStageId, updatedAt: new Date() } : t)))

      addActivityLog({
        type: "stage_moved",
        description: `Moved task "${task.title}" to ${newStage.name}`,
        user: mockUsers[0],
        taskId,
      })

      // Auto-assign to next team if stage is completed
      if (newStage.isCompleted && newStage.nextStageId) {
        const nextStage = stages.find((s) => s.id === newStage.nextStageId)
        if (nextStage?.assignedTeam) {
          addActivityLog({
            type: "assignment_changed",
            description: `Task automatically assigned to ${nextStage.assignedTeam} team`,
            user: mockUsers[0],
            taskId,
          })
        }
      }
    },
    [tasks, stages, addActivityLog],
  )

  const createStage = useCallback(
    (name: string, color: string) => {
      const newStage: Stage = {
        id: Date.now().toString(),
        name,
        color,
        order: stages.length + 1,
        isCompleted: false,
        tasks: [],
      }

      setStages((prev) => [...prev, newStage])
    },
    [stages.length],
  )





  const deleteTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      addActivityLog({
        type: "task_deleted",
        description: `Deleted task "${task.title}"`,
        user: mockUsers[0],
        taskId,
      })
    },
    [tasks, addActivityLog],
  )

  return {
    tasks,
    stages,
    tasksByStage,
    activityLog,
    selectedTask,
    view,
    users: mockUsers,
    tags: mockTags,
    setSelectedTask,
    setView,
    createTask,
    updateTask,
    moveTask,
    createStage,
    deleteTask,
  }
}


