"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

type Department = {
  id: string
  name: string
}

type User = {
  id: string
  name: string
  email: string
  role: string
  departmentId: string | null
  department: {
    name: string
  } | null
}

export default function AdminSettings() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newDepartmentName, setNewDepartmentName] = useState("")
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedManager, setSelectedManager] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editedDepartmentName, setEditedDepartmentName] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentsRes, usersRes] = await Promise.all([fetch("/api/departments"), fetch("/api/users")])

        if (departmentsRes.ok && usersRes.ok) {
          const departmentsData = await departmentsRes.json()
          const usersData = await usersRes.json()
          setDepartments(departmentsData)
          setUsers(usersData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [toast])

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDepartmentName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDepartmentName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create department")
      }

      const newDepartment = await response.json()
      setDepartments([...departments, newDepartment])
      setNewDepartmentName("")
      toast({
        title: "Department Created",
        description: "The department has been created successfully",
      })
    } catch (error) {
      console.error("Error creating department:", error)
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || (!selectedRole && !selectedDepartment && !selectedManager)) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${selectedUser}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole || undefined,
          departmentId: selectedDepartment || undefined,
          managerId: selectedManager === "unassigned" ? null : (selectedManager || undefined),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user")
      }

      const updatedUser = await response.json()
      setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      setSelectedUser("")
      setSelectedRole("")
      setSelectedDepartment("")
      setSelectedManager("")
      toast({
        title: "User Updated",
        description: "The user has been updated successfully",
      })
      router.refresh()
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department)
    setEditedDepartmentName(department.name)
    setIsEditDialogOpen(true)
  }

  const handleSaveDepartment = async () => {
    if (!editingDepartment || !editedDepartmentName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editedDepartmentName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update department")
      }

      const updatedDepartment = await response.json()
      setDepartments(departments.map((dept) => (dept.id === updatedDepartment.id ? updatedDepartment : dept)))

      setIsEditDialogOpen(false)
      setEditingDepartment(null)

      toast({
        title: "Department Updated",
        description: "The department has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating department:", error)
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue="departments">
      <TabsList>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="departments">
        <div className="space-y-6">
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Create Department</CardTitle>
              <CardDescription>Add a new department to your organization</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateDepartment}>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="department-name">Department Name</Label>
                  <Input
                    id="department-name"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Enter department name"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Department"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Existing Departments</CardTitle>
              <CardDescription>Manage your organization's departments</CardDescription>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500">No departments yet</p>
              ) : (
                <div className="space-y-4">
                  {departments.map((department) => (
                    <div key={department.id} className="flex items-center justify-between border p-3 rounded-md">
                      <span className="font-medium">{department.name}</span>
                      <Button variant="outline" size="sm" onClick={() => handleEditDepartment(department)}>
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="users">
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>Update user roles and departments</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateUser}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORG_ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                        
                  <div className="space-y-2">
                    <Label htmlFor="manager">Assigned Manager</Label>
                    <Select value={selectedManager} onValueChange={setSelectedManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">None</SelectItem>
                        {users
                          .filter((user) => user.id !== selectedUser && user.role === "MANAGER")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !selectedUser || (!selectedRole && !selectedDepartment && !selectedManager)}>
                {isLoading ? "Updating..." : "Update User"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>View organization analytics and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Analytics feature coming soon</p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update the department name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department-name">Department Name</Label>
              <Input
                id="edit-department-name"
                value={editedDepartmentName}
                onChange={(e) => setEditedDepartmentName(e.target.value)}
                placeholder="Enter department name"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
