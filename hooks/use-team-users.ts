import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"

export interface TeamUser {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  managerId?: string
}

export function useTeamUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)

        // If user is a manager, fetch only their subordinates
        // Otherwise, fetch all organization users (for org admins) or empty list (for employees)
        const endpoint = user?.role === "MANAGER" ? "/api/users/my-team" : "/api/org-admin/users"

        const response = await fetch(endpoint)
        if (!response.ok) throw new Error("Failed to fetch users")

        const data = await response.json()
        // Handle both response formats
        const userList = Array.isArray(data) ? data : data.users || []
        setUsers(userList)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load users"
        setError(message)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchUsers()
    }
  }, [user?.id, user?.role])

  return { users, loading, error }
}
