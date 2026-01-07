"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, UserMinus } from "lucide-react"
import { toast } from "sonner"
// import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface AssigneeManagerProps {
  taskId: string
  allUsers: User[]
  assignees: User[]
  onAssigneesChange: (assignees: User[]) => void
}

export function AssigneeManager({ taskId, allUsers, assignees, onAssigneesChange }: AssigneeManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  // const { toast } = useToast()

  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const isAssigned = (userId: string) => assignees?.some((assignee) => assignee.id === userId)

  const handleAssignToggle = async (user: User) => {
    setLoading(true)
    try {
      const isCurrentlyAssigned = isAssigned(user.id)

      if (isCurrentlyAssigned) {
        // Unassign user
        const response = await fetch(`/api/tasks/${taskId}/assignees`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })

        if (!response.ok) throw new Error("Failed to unassign user")

        const newAssignees = assignees.filter((a) => a.id !== user.id)
        onAssigneesChange(newAssignees)

        toast("User Unassigned",{
          description: `${user.name} has been removed from this task`,
        })
      } else {
        // Assign user
        const response = await fetch(`/api/tasks/${taskId}/assignees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })

        if (!response.ok) throw new Error("Failed to assign user")

        const newAssignees = [...assignees, user]
        onAssigneesChange(newAssignees)

        toast("User Assigned",{
          description: `${user.name} has been assigned to this task`,
        })
      }
    } catch (error) {
      toast("Error",{
        description: error instanceof Error ? error.message : "Failed to update assignment",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Current Assignees */}
      {assignees?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Current Assignees ({assignees.length})</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {assignees.map((assignee) => (
              <Badge key={assignee.id} variant="secondary" className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={assignee.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs">{assignee.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {assignee.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* All Users List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <Badge variant="outline" className="text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>

            <Button
              variant={isAssigned(user.id) ? "destructive" : "default"}
              size="sm"
              onClick={() => handleAssignToggle(user)}
              disabled={loading}
            >
              {isAssigned(user.id) ? (
                <>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Unassign
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign
                </>
              )}
            </Button>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <p className="text-center text-gray-500 py-4">No users found matching your search.</p>
      )}
    </div>
  )
}
