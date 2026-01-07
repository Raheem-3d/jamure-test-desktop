
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, UserPlus, Building, Mail, Lock, User, ArrowRight, Briefcase } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [department, setDepartment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [taskInfo, setTaskInfo] = useState({ title: "" })
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get("token")
  const emailParam = searchParams.get("email")
  const taskId = searchParams.get("taskId")

  useEffect(() => {
    if (token && emailParam && taskId) {
      setIsInvited(true)
      setEmail(emailParam)
      
      const fetchTaskDetails = async () => {
        try {
          const res = await fetch(`/api/tasks/${taskId}`)
          if (res.ok) {
            const data = await res.json()
            setTaskInfo(data)
          }
        } catch (error) {
          console.error("Failed to fetch task details", error)
        }
      }
      fetchTaskDetails()
    }
  }, [token, emailParam, taskId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          department,
          ...(token && { token }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      toast.success("Registration Successful", {
        description: data.message || "You can now login to your account",
      })

      if (data.hasTaskAccess) {
        router.push(`/dashboard/tasks/${data.taskId}`)
      } else {
        router.push("/login")
      }
    } catch (error: any) {
      toast.error("Registration Failed", {
        description: error.message || "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const departments = [
    { value: "hr", label: "Human Resources" },
    { value: "sales", label: "Sales" },
    { value: "admin", label: "Admin" },
    { value: "finance", label: "Finance" },
    { value: "cad", label: "CAD" },
    { value: "max", label: "MAX" },
    { value: "vfx", label: "VFX" },
    { value: "web-seo", label: "WEB & SEO" },
    { value: "digital", label: "Digital" },
    { value: "graphics", label: "Graphics" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isInvited ? "Join Project" : "Create Account"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isInvited ? (
              <>
                You've been invited to collaborate on{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {taskInfo.title || "a project"}
                </span>
              </>
            ) : (
              "Create your workspace account to get started"
            )}
          </p>
        </div>

        <Card className="border border-gray-200 dark:border-gray-700 shadow-lg dark:bg-gray-900">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-gray-900 dark:text-white">
              {isInvited ? "Complete Registration" : "Sign Up"}
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-400">
              {isInvited 
                ? "Fill in your details to join the project" 
                : "Enter your information to create an account"
              }
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Name Field */}
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="name" 
                    placeholder="A.Raheem" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required
                    className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={isInvited}
                    className={`pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 ${
                      isInvited ? "bg-gray-50 dark:bg-gray-700 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Must be a valid company email address
                </p>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Department Field - Only show if not invited */}
              {!isInvited && (
                <div className="space-y-3">
                  <Label htmlFor="department" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Department
                  </Label>
                  <Select value={department} onValueChange={setDepartment} required>
                    <SelectTrigger className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Project Info for invited users */}
              {isInvited && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Project Access</span>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    You'll gain immediate access to <strong>{taskInfo.title || "the project"}</strong> after registration
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isInvited ? "Joining Project..." : "Creating Account..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {isInvited ? "Join Project & Register" : "Create Account"}
                  </div>
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1"
                >
                  Sign in
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}