"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import type { Permission } from "@/lib/permissions"

interface UserPermissionsManagerProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  onPermissionsUpdated?: () => void
}

const GRANTABLE_PERMISSIONS: { 
  key: Permission
  label: string
  description: string
  category: string
}[] = [
  // Task Permissions
  { 
    key: "TASK_CREATE", 
    label: "Create Tasks", 
    description: "Allow user to create new tasks",
    category: "Tasks"
  },
  { 
    key: "TASK_EDIT", 
    label: "Edit Tasks", 
    description: "Allow user to edit task details",
    category: "Tasks"
  },
  { 
    key: "TASK_DELETE", 
    label: "Delete Tasks", 
    description: "Allow user to delete tasks",
    category: "Tasks"
  },
  { 
    key: "TASK_VIEW_ALL", 
    label: "View All Tasks", 
    description: "View all organization tasks (not just assigned ones)",
    category: "Tasks"
  },
  
  // Channel Permissions
  { 
    key: "CHANNEL_CREATE", 
    label: "Create Channels", 
    description: "Allow user to create new channels",
    category: "Channels"
  },
  { 
    key: "CHANNEL_MANAGE", 
    label: "Manage Channels", 
    description: "Edit channel settings and add/remove members",
    category: "Channels"
  },
  { 
    key: "CHANNEL_DELETE", 
    label: "Delete Channels", 
    description: "Allow user to delete channels",
    category: "Channels"
  },
  { 
    key: "CHANNEL_VIEW_ALL", 
    label: "View All Channels", 
    description: "View all organization channels (including private ones)",
    category: "Channels"
  },
]

export function UserPermissionsManager({
  userId,
  userName,
  userEmail,
  userRole,
  onPermissionsUpdated
}: UserPermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Fetch current permissions
  useEffect(() => {
    async function fetchPermissions() {
      setLoading(true)
      try {
        const res = await fetch(`/api/org-admin/users/${userId}/permissions`)
        if (!res.ok) throw new Error('Failed to fetch permissions')
        const data = await res.json()
        setPermissions(data.permissions || [])
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message })
      } finally {
        setLoading(false)
      }
    }
    
    fetchPermissions()
  }, [userId])
  
  const handleToggle = (perm: Permission) => {
    setPermissions(prev => 
      prev.includes(perm) 
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    )
  }
  
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch(`/api/org-admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to update permissions')
      }
      
      setMessage({ type: 'success', text: 'Permissions updated successfully' })
      onPermissionsUpdated?.()
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }
  
  // Group permissions by category
  const groupedPermissions = GRANTABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, typeof GRANTABLE_PERMISSIONS>)
  
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Loading permissions...</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Permissions</CardTitle>
        <CardDescription>
          Grant or revoke permissions for <strong>{userName}</strong> ({userEmail})
          <br />
          Role: <span className="font-semibold">{userRole}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permissions grouped by category */}
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {category}
            </h3>
            <div className="space-y-2">
              {perms.map(perm => (
                <div 
                  key={perm.key} 
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Checkbox
                    id={perm.key}
                    checked={permissions.includes(perm.key)}
                    onCheckedChange={() => handleToggle(perm.key)}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={perm.key} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {perm.label}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Status message */}
        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}
        
        {/* Save button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Permissions'}
        </Button>
      </CardContent>
    </Card>
  )
}
