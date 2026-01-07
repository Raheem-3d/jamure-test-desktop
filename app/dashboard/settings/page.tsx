


import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProfileSettings from "@/components/profile-settings"
import AdminSettings from "@/components/admin-settings"
import NotificationSettings from "@/components/notification-settings"
import { 
  User, 
  Settings, 
  Shield, 
  Bell,
  ChevronRight,
  Mail,
  Lock,
  Palette
} from "lucide-react"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Get user with role
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      department: true,
    },
  })

  const isAdmin = user?.role === "ADMIN" || user?.role === "ORG_ADMIN"

  return (
    <div className=" bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-green-500 rounded-2xl">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* WhatsApp-style Settings Layout */}
        <div className="space-y-6 dark:bg-gray-900 ">
          {/* Profile Card */}
        

          {/* Settings Tabs */}
          <Card className=" border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl ">
            <CardContent className="p-0">
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="w-full h-14 bg-transparent p-0 border-b border-gray-200 dark:border-gray-700 rounded-none">
                  <TabsTrigger 
                    value="profile" 
                    className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:text-green-600 data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </div>
                  </TabsTrigger>
                  
                  {/* <TabsTrigger 
                    value="notifications" 
                    className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:text-green-600 data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </div>
                  </TabsTrigger> */}

             
                  
                  {isAdmin && (
                    <TabsTrigger 
                      value="admin" 
                      className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:text-green-600 data-[state=active]:shadow-none"
                    >
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="p-6">
                  <TabsContent value="profile" className="mt-0 space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Update your personal details and profile information
                      </p>
                    </div>
                    <ProfileSettings user={user} />
                  </TabsContent>

                  {/* <TabsContent value="notifications" className="mt-0">
                    <div className="space-y-1 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Manage how you receive notifications
                      </p>
                    </div>
                    <NotificationSettings />
                  </TabsContent> */}

                  {isAdmin && (
                    <TabsContent value="admin" className="mt-0">
                      <div className="space-y-1 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Panel</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Manage organization settings and user permissions
                        </p>
                      </div>
                      <AdminSettings />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>

     
        

          {/* User Info Footer */}
          <div className="text-center py-6 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span>
            </p>
            {user?.department && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {user.department.name} • {user.role}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}