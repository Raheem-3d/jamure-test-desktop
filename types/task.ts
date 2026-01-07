export interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: "low" | "medium" | "high" | "urgent"
  assignees?: User
  dueDate?: Date
  tags: Tag[]
  stageId: string
  createdAt: Date
  updatedAt: Date
  comments: Comment[]
  attachments: Attachment[]
}

export interface Stage {
  id: string
  name: string
  color: string
  order: number
  isCompleted: boolean
  nextStageId?: string
  assignedTeam?: string
  tasks: Task[]
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Comment {
  id: string
  content: string
  author: User
  createdAt: Date
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export interface ActivityLog {
  id: string
  type: "task_created" | "task_updated" | "task_deleted" | "stage_moved" | "assignment_changed"
  description: string
  user: User
  taskId?: string
  timestamp: Date
  metadata?: Record<string, any>
}
