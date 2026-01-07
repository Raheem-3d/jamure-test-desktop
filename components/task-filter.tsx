"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Filter } from "lucide-react"

type FilterProps = {
  onFilterChange: (filters: any) => void
}

export default function TaskFilter({ onFilterChange }: FilterProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [priority, setPriority] = useState<string | null>(null)
  const [showAssignedToMe, setShowAssignedToMe] = useState(false)
  const [showCreatedByMe, setShowCreatedByMe] = useState(false)
  const [open, setOpen] = useState(false)

  const handleApplyFilters = () => {
    const filters: any = {}
    
    // Only add filters if they have valid values (not null and not "ANY")
    if (status && status !== "ANY") {
      filters.status = status
    }
    
    if (priority && priority !== "ANY") {
      filters.priority = priority
    }
    
    if (showAssignedToMe) {
      filters.assignedToMe = true
    }
    
    if (showCreatedByMe) {
      filters.createdByMe = true
    }
    
    onFilterChange(filters)
    setOpen(false)
  }

  const handleResetFilters = () => {
    setStatus(null)
    setPriority(null)
    setShowAssignedToMe(false)
    setShowCreatedByMe(false)
    onFilterChange({})
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Tasks</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status || ""} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any status</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority || ""} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Any priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assignedToMe"
                checked={showAssignedToMe}
                onCheckedChange={(checked) => setShowAssignedToMe(checked === true)}
              />
              <Label htmlFor="assignedToMe">Assigned to me</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createdByMe"
                checked={showCreatedByMe}
                onCheckedChange={(checked) => setShowCreatedByMe(checked === true)}
              />
              <Label htmlFor="createdByMe">Created by me</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleResetFilters}>
            Reset
          </Button>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
