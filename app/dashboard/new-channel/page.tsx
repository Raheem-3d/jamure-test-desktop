"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, Hash, Globe, Lock, ArrowLeft, Search } from "lucide-react"
import { toast } from "sonner"
import { usePermissions } from "@/lib/rbac-utils"
import { useTeamUsers } from "@/hooks/use-team-users"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"

type Department = {
  id: string
  name: string
}

type User = {
  id: string
  name: string
  email: string
  departmentId: string | null
}

export default function NewChannelPage() {
  const { data: session } = useSession()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [departmentId, setDepartmentId] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const perms = usePermissions()
const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
    const debounceRef = useRef<number | undefined>(undefined)
  
  // const { users, loading: usersLoading } = useTeamUsers()
 const { users, loading: isFetchingUsers } = useTeamUsers()
  // Check if user has permission to manage channels
  useEffect(() => {
    if (session?.user) {
      if (!perms.canManageChannels) {
        toast.error("Access Denied", {
          description: "You don't have permission to create channels",
        })
        router.push("/dashboard")
      }
    }
  }, [session, router, perms])

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentsRes = await fetch("/api/departments")

        if (departmentsRes.ok) {
          const departmentsData = await departmentsRes.json()
          setDepartments(departmentsData)
        }
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast.error("Failed to load departments")
      }
    }

    fetchDepartments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/channels/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          departmentId: !departmentId || departmentId === 'none' ? null : departmentId,
          members: assignees,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create channel")
      }

      const channel = await response.json()
      
      toast.success("Channel created successfully", {
        description: "Your new channel is ready for collaboration",
      })

      // Notify sidebar and other listeners to refresh immediately
      try {
        window.dispatchEvent(new CustomEvent('channel:created', { detail: channel }))
      } catch {}

      router.push(`/dashboard/channels/${channel.id}`)
      router.refresh()
    } catch (error) {
      toast.error("Failed to create channel")
    } finally {
      setIsLoading(false)
    }
  }



    useEffect(() => {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        setDebouncedSearch(search.trim())
      }, 300)
  
      return () => window.clearTimeout(debounceRef.current)
    }, [search])
  
    const filteredPeople = useMemo(() => {
      const q = debouncedSearch.toLowerCase()
      if (!q) return users ?? []
      return (users ?? []).filter((u) => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
      )
    }, [users, debouncedSearch])

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const currentUser = session?.user as User;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 py-4">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header - Compact */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              Create Channel
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              Create a new channel for team collaboration
            </p>
          </div>
        </div>

        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm max-h-[calc(100vh-120px)] flex flex-col dark:bg-gray-900">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Hash className="h-5 w-5 text-blue-600" />
              Channel Details
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Configure your new channel settings and members
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 p-6">
                {/* Channel Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Channel Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., marketing-team, project-alpha"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the purpose of this channel..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="min-h-[80px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Department and Privacy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department
                    </Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {isPublic ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-orange-600" />
                      )}
                      Channel Type
                    </Label>
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 h-10">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {isPublic ? "Public Channel" : "Private Channel"}
                        </p>
                      </div>
                      <Switch 
                        checked={isPublic} 
                        onCheckedChange={setIsPublic}
                        className="data-[state=checked]:bg-green-600 scale-90"
                      />
                    </div>
                  </div> */}


                </div>

                {/* Team Members */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Add Team Members
                  </Label>


 <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search team members..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  </div>

   {isFetchingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">Loading team members...</span>
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50">
                      {filteredPeople.length === 0 ? (
                        <div className="text-center py-3 text-gray-500 text-sm">
                          {search ? "No team members found" : "No team members available"}
                        </div>
                      ) : (
                        filteredPeople.map((user) => (
                          <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={assignees.includes(user.id)}
                              onCheckedChange={() => toggleAssignee(user.id)}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`user-${user.id}`}
                                className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer flex items-center gap-2"
                              >
                                {user.name}
                               
                              </Label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                  
                  {/* {!isFetchingUsers ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">Loading team members...</span>
                    </div>
                  ) : (
                   
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50">
  {users
    .filter(user => user.id !== currentUser.id)
    .map((user) => (
      <div
        key={user.id}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
      >
        <Checkbox
          id={`user-${user.id}`}
          checked={assignees.includes(user.id)}
          onCheckedChange={() => toggleAssignee(user.id)}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
        <div className="flex-1 min-w-0">
          <Label
            htmlFor={`user-${user.id}`}
            className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
          >
            {user.name}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.email}
          </p>
        </div>
      </div>
    ))} */}
</div>

                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {assignees.length} member{assignees.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                <Link href="/dashboard" className="flex-1 order-2 sm:order-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-9 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 order-1 sm:order-2 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Create Channel
                    </div>
                  )}
                </Button>
              </CardFooter>
            </form>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}