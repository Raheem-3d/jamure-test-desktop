"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { RoleBasedAccess } from "@/lib/role-based-access"

export default function InvitePeoplePage() {
  const [emails, setEmails] = useState("")
  const [department, setDepartment] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!emails.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least one email address",
        variant: "destructive",
      })
      return
    }

    // Split and trim emails
    const emailList = emails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0)

    // Validate emails
    const invalidEmails = emailList.filter((email) => !email.includes("@"))
    if (invalidEmails.length > 0) {
      toast({
        title: "Invalid Emails",
        description: `The following emails are invalid: ${invalidEmails.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailList[0],
          departmentId: department || undefined,
          message,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send invitations")
      }

      toast({
        title: "Invitations Sent",
        description: `Invitations have been sent to ${emailList.length} email(s)`,
      })
      router.push("/dashboard/people")
    } catch (error) {
      console.error("Error sending invitations:", error)
      toast({
        title: "Error",
        description: "Failed to send invitations",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <RoleBasedAccess
      allowedRoles={["ADMIN", "MANAGER"]}
      fallback={
        <div className="max-w-2xl mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to invite people</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Only admins and managers can invite new people to the organization.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => router.push("/dashboard/people")}>
                Go Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Invite People</CardTitle>
            <CardDescription>Invite new members to join your organization</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder="Enter email addresses separated by commas"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  required
                  rows={3}
                />
                <p className="text-xs text-gray-500">Enter multiple email addresses separated by commas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department (Optional)</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="marketing"></SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to the invitation"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.push("/dashboard/people")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invitations"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </RoleBasedAccess>
  )
}
