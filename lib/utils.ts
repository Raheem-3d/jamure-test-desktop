import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}

export function getDepartmentColor(departmentName: string) {
  const colors = [
    "bg-red-100 text-red-800",
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
  ]

  // Simple hash function to get consistent color for department
  let hash = 0
  for (let i = 0; i < departmentName.length; i++) {
    hash = departmentName.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case "LOW":
      return "bg-blue-100 text-blue-800"
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800"
    case "HIGH":
      return "bg-orange-100 text-orange-800"
    case "URGENT":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case "TODO":
      return "bg-gray-100 text-gray-800"
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800"
    case "DONE":
      return "bg-green-100 text-green-800"
    case "BLOCKED":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}
