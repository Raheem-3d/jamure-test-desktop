
"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Plus, X, Users, Briefcase, Mail, Search, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { usePermissions } from "@/lib/rbac-utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DescriptionGenerator } from "@/components/description-generator"
import { useTeamUsers } from "@/hooks/use-team-users"

type User = {
  id: string
  name: string
  email: string
  role: string
}

type ClientEmail = {
  email: string
  role: string
  access: string
}

export default function NewTaskPage() {
  const { data: session } = useSession()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [deadlineRange, setDeadlineRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [useRange, setUseRange] = useState(false)
  const [assignees, setAssignees] = useState<string[]>([])
  const [clientEmails, setClientEmails] = useState<ClientEmail[]>([])
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientRole, setNewClientRole] = useState("CLIENT")
  const [newClientAccess, setNewClientAccess] = useState("VIEW")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const perms = usePermissions()
  // Accept either canCreateTasks or canManageProjects
  const canAccess = perms.canCreateTasks || perms.canManageProjects
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<number | undefined>(undefined)

  // Use the new hook to get team users
  const { users, loading: isFetchingUsers } = useTeamUsers()

  // Check if user has permission to create tasks/projects
  useEffect(() => {
    if (session?.user) {
      if (!perms.canCreateTasks && !perms.canManageProjects) {
        toast.error("Access Denied", {
          description: "You don't have permission to create projects. You need either TASK_CREATE or PROJECT_MANAGE permission.",
        })
        router.push("/dashboard")
      }
    }
  }, [session, router, perms])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Project title is required")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          deadline,
          deadlineRange: useRange && deadlineRange.from ? { from: deadlineRange.from, to: deadlineRange.to ?? deadlineRange.from } : null,
          assignees,
          clientEmails,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const task = await response.json()
      
      toast.success("Project Created", {
        description: "Your new project has been created successfully.",
      })

      // Notify sidebar and other listeners to refresh immediately
      try {
        window.dispatchEvent(new CustomEvent('task:created', { detail: task }))
        window.dispatchEvent(new CustomEvent('project:created', { detail: task }))
      } catch {}

      if (canAccess) {
        router.push(`/dashboard/tasks/${task.id}/record`)
        router.refresh()
      }
      router.push(`/dashboard/tasks/${task.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("Failed to create project")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const addClientEmail = () => {
    if (!newClientEmail.trim()) {
      toast.error("Email is required")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    if (clientEmails.some(client => client.email === newClientEmail)) {
      toast.error("This email is already added")
      return
    }

    setClientEmails(prev => [
      ...prev,
      {
        email: newClientEmail,
        role: newClientRole,
        access: newClientAccess
      }
    ])
    setNewClientEmail("")
  }

  const removeClientEmail = (email: string) => {
    setClientEmails(prev => prev.filter(client => client.email !== email))
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

  const getAccessBadgeVariant = (access: string) => {
    switch (access) {
      case "EDIT": return "default"
      case "COMMENT": return "secondary"
      case "VIEW": return "outline"
      default: return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 py-4">      
      <div className="max-w-2xl mx-auto px-4">

   <div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 mb-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
   </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New Project</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Set up a new project and assign team members
          </p>
        </div>

        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm max-h-[calc(100vh-100px)] flex flex-col dark:bg-gray-900">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <CardTitle className="text-lg text-gray-900 dark:text-white">Project Details</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Fill in the project information
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-2 p-6">
                {/* Project Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Title *
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter project title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </Label>
                    <DescriptionGenerator
                      title={title}
                      onGenerate={setDescription}
                      type="project"
                      disabled={isLoading}
                    />
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Describe the project goals and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="min-h-[90px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/*  Deadline   */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Deadline
                    </Label>
                    <div className="flex items-center gap-2">
                      <Checkbox id="use-range" checked={useRange} onCheckedChange={(v) => setUseRange(!!v)} />
                      <Label htmlFor="use-range" className="text-xs text-gray-600 dark:text-gray-400">Select range</Label>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          (!useRange && !deadline || (useRange && !deadlineRange.from)) && "text-gray-400 dark:text-gray-500"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {!useRange
                          ? (deadline ? format(deadline, "PPP") : "Select deadline")
                          : (deadlineRange.from && deadlineRange.to
                              ? `${format(deadlineRange.from, "PPP")} — ${format(deadlineRange.to, "PPP")}`
                              : (deadlineRange.from
                                  ? `${format(deadlineRange.from, "PPP")} — …`
                                  : "Select deadline range"))}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {!useRange ? (
                        <Calendar 
                          mode="single" 
                          selected={deadline} 
                          onSelect={setDeadline} 
                          initialFocus 
                          className="rounded-md border"
                        />
                      ) : (
                        <Calendar
                          mode="range"
                          selected={deadlineRange as any}
                          onSelect={(r: any) => setDeadlineRange(r || { from: undefined, to: undefined })}
                          numberOfMonths={2}
                          initialFocus
                          className="rounded-md border"
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator className="my-3" />

                {/* Team Members Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Team Members
                    </Label>
                  </div>

                  {/* Search */}
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

                  {/* Users List */}
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
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* Clients Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client Access
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Input
                        type="email"
                        placeholder="Enter client email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="flex-1 h-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                      <Select value={newClientAccess} onValueChange={setNewClientAccess}>
                        <SelectTrigger className="w-full sm:w-[130px] h-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Access" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEW">View Only</SelectItem>
                          <SelectItem value="COMMENT">Can Comment</SelectItem>
                          <SelectItem value="EDIT">Can Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        onClick={addClientEmail}
                        className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-1">Add</span>
                      </Button>
                    </div>

                    {/* Client List */}
                    {clientEmails.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50">
                        {clientEmails.map((client) => (
                          <div key={client.email} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{client.email}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    {client.role}
                                  </Badge>
                                  <Badge variant={getAccessBadgeVariant(client.access)} className="text-xs px-1.5 py-0">
                                    {client.access}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeClientEmail(client.email)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-2  border-t border-gray-100 dark:border-gray-700 flex-shrink-0 ">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 h-9 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || isFetchingUsers}
                  className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white order-1 sm:order-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Create Project
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