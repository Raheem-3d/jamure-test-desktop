"use client"
import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Permission } from "@/lib/permissions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  title?: string
  description?: string
}

export default function OrgAddUserForm({ title = "Add Person", description = "Create a user in your organization" }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [deptLoading, setDeptLoading] = useState<boolean>(false)
  const [deptError, setDeptError] = useState<string | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
  const [managers, setManagers] = useState<{ id: string; name: string; email: string }[]>([])
  const [managersLoading, setManagersLoading] = useState<boolean>(false)
  const [managersError, setManagersError] = useState<string | null>(null)
  const [selectedManager, setSelectedManager] = useState<string>("")

  // Use existing app permission definitions
  // Organization-scoped permissions only (exclude super-admin and cross-org)
  const PERMISSIONS: { key: Permission; label: string }[] = [
    { key: "TASK_CREATE", label: "Tasks: Create" },
    { key: "TASK_EDIT", label: "Tasks: Edit" },
    { key: "TASK_VIEW", label: "Tasks: View" },
    { key: "TASK_DELETE", label: "Tasks: Delete" },
    { key: "TASK_VIEW_ALL", label: "Tasks: View All" },
    { key: "CHANNEL_CREATE", label: "Channels: Create" },
    { key: "CHANNEL_VIEW_ALL", label: "Channels: View All" },
    { key: "CHANNEL_MANAGE", label: "Channels: Manage" },
    { key: "CHANNEL_DELETE", label: "Channels: Delete" },
  ]


  // channel create,edit,delete,view ,or Task,add ,edit,delete,view, karne ka option do.
  // or ager user ko jis ka permissions de wo wohi cheezy permonece kar sake,durese chhezt nhi.jaise abhi mai 
  // Fetch departments list (optional selection)
  useEffect(() => {
    let abort = false
    async function loadDeps() {
      setDeptLoading(true)
      setDeptError(null)
      try {
        // Try a common endpoint; adjust if your API differs.
        const res = await fetch("/api/departments", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load departments")
        const data = await res.json()
        const list: any[] = Array.isArray(data?.departments) ? data.departments : Array.isArray(data) ? data : []
        if (!abort) {
          setDepartments(list.map(d => ({ id: d.id, name: d.name || "Unnamed" })))
        }
      } catch (e: any) {
        if (!abort) setDeptError(e.message || "Couldn't load departments")
      } finally {
        if (!abort) setDeptLoading(false)
      }
    }
    loadDeps()
    return () => { abort = true }
  }, [])

  // Fetch managers list
  useEffect(() => {
    let abort = false
    async function loadManagers() {
      setManagersLoading(true)
      setManagersError(null)
      try {
        const res = await fetch("/api/org-admin/managers", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load managers")
        const data = await res.json()
        const list: any[] = Array.isArray(data?.managers) ? data.managers : Array.isArray(data) ? data : []
        if (!abort) {
          setManagers(list.map(m => ({ id: m.id, name: m.name || "Unnamed", email: m.email || "" })))
        }
      } catch (e: any) {
        if (!abort) setManagersError(e.message || "Couldn't load managers")
      } finally {
        if (!abort) setManagersLoading(false)
      }
    }
    loadManagers()
    return () => { abort = true }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    
    // Attach selected manager if any
    if (selectedManager && selectedManager.trim() !== "") {
      fd.set("managerId", selectedManager)
    }
    
    // Attach selected permissions as repeated field permissions[]
    // Ensure we only send org-scoped permissions (defensive)
    selectedPermissions
      .filter(p => p !== "SUPER_ADMIN_ACCESS" && p !== "CROSS_ORG_ACCESS")
      .forEach(p => fd.append("permissions[]", p))
    
    // If departmentId is blank remove it so backend treats as unset
    const dept = fd.get("departmentId")
    if (!dept || String(dept).trim() === "") fd.delete("departmentId")
    
    try {
      const res = await fetch("/api/org-admin/users", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || `Failed with ${res.status}`)
      }
      form.reset()
      setSelectedManager("")
      setSuccess("Person added successfully")
      startTransition(() => router.refresh())
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <Input name="name" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input type="email" name="email" placeholder="user@example.com" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Password</label>
              <Input type="password" name="password" placeholder="Optional (auto if empty)" />
            </div>
            <div>
              <label className="block text-sm mb-1 ">Role</label>
              <select name="role" className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-900 dark:text-white px-3 text-sm">
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Department (optional)</label>
            <select
              name="departmentId"
              disabled={deptLoading}
              className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-900 dark:text-white px-3 text-sm"
              defaultValue=""
            >
              <option value="">-- Select Department --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {deptLoading && <p className="text-xs text-gray-500 mt-1">Loading departments...</p>}
            {deptError && <p className="text-xs text-red-600 mt-1">{deptError}</p>}
          </div>

          <div>
            <label className="block text-sm mb-1">Manager (optional)</label>
            <select
              disabled={managersLoading}
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-900 dark:text-white px-3 text-sm"
            >
              <option value="">-- No Manager --</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
              ))}
            </select>
            {managersLoading && <p className="text-xs text-gray-500 mt-1">Loading managers...</p>}
            {managersError && <p className="text-xs text-red-600 mt-1">{managersError}</p>}
            <p className="text-xs text-gray-500 mt-1">Assign this user to a manager. Manager will only see users under them.</p>
          </div>
          {/* Permissions selector */}
          <div>
            <label className="block text-sm mb-1">Permissions</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-3 dark:border-gray-700">
              {PERMISSIONS.map((perm) => {
                const checked = selectedPermissions.includes(perm.key)
                return (
                  <label key={perm.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={(e) => {
                        const isOn = e.target.checked
                        setSelectedPermissions((prev) => {
                          if (isOn) return [...prev, perm.key]
                          return prev.filter((p) => p !== perm.key)
                        })
                      }}
                    />
                    <span>{perm.label}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Grant only what this user needs. You can update permissions later.</p>
          </div>
   
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add Person"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
