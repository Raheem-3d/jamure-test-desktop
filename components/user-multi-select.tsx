"use client"

import { useState, useEffect, type Dispatch, type SetStateAction } from "react"
import { ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { useTeamUsers } from "@/hooks/use-team-users"

type User = {
  id: string
  name: string
  email: string
  image?: string
}

type UserMultiSelectProps = {
  selectedUsers: string[]
  onChange: Dispatch<SetStateAction<string[]>>
  excludeUserIds?: string[]
  placeholder?: string
  // Optional: when used by super admin to select users of a specific org
  organizationId?: string
  adminScope?: boolean
}

export function UserMultiSelect({
  selectedUsers,
  onChange,
  excludeUserIds,
  placeholder = "Select users...",
  organizationId,
  adminScope = false,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Use team users hook for role-based filtering
  const { users: teamUsers, loading: teamUsersLoading, error: teamUsersError } = useTeamUsers()
  
  // For super admin scope with specific org, fall back to fetch from superadmin endpoint
  const [rawUsers, setRawUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(adminScope && organizationId ? true : teamUsersLoading)
  
  // Only fetch from superadmin endpoint if explicitly requested with organizationId
  useEffect(() => {
    if (adminScope && organizationId) {
      const fetchUsers = async () => {
        try {
          const response = await fetch(`/api/superadmin/users?organizationId=${encodeURIComponent(organizationId)}`)
          if (response.ok) {
            const data = await response.json()
            setRawUsers(data)
          }
        } catch (error) {
          console.error("Error fetching users:", error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchUsers()
    } else {
      // Use team users from hook
      setRawUsers(teamUsers)
      setIsLoading(teamUsersLoading)
    }
  }, [organizationId, adminScope, teamUsers, teamUsersLoading])

  const filteredUsers = rawUsers
    .filter((user) => !(excludeUserIds?.includes(user.id)))
    .filter((user) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      )
    })
  const selectedUserObjects = rawUsers.filter((user) => selectedUsers.includes(user.id))

  const handleSelect = (userId: string) => {
    onChange((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
    // Don't auto-close popover for multi-select UX
  }

  const removeUser = (userId: string) => {
    onChange((prev) => prev.filter((id) => id !== userId))
  }

  return (
    <div className="space-y-2">
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {selectedUsers.length === 0 ? placeholder : `${selectedUsers.length} user(s) selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          data-user-multi-select 
          className="w-full p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search users..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                }
              }}
            />
            <CommandList>
              <CommandEmpty>{isLoading ? "Loading users..." : "No users found."}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredUsers.map((user) => (
                  <CommandItem 
                    key={user.id} 
                    value={`${user.name} ${user.email}`} 
                    onSelect={(currentValue) => {
                      handleSelect(user.id)
                      // Prevent Command from closing popover
                      setTimeout(() => setOpen(true), 0)
                    }}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      className="mr-2 pointer-events-none"
                      aria-label={`Select ${user.name}`}
                    />
                    <UserAvatar user={user} size="sm" showStatus={false} />
                    <div className="ml-2 flex-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUserObjects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUserObjects.map((user) => (
            <Badge key={user.id} variant="secondary" className="gap-1">
              <UserAvatar user={user} size="sm" showStatus={false} />
              <span className="ml-1">{user.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeUser(user.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
