import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDepartmentColor } from "@/lib/utils"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import PeopleSearch from "@/components/people-search"
import { getSessionUserWithPermissions } from "@/lib/org"
import { hasPermission } from "@/lib/permissions"
import OrgAddUserForm from "@/components/org-add-user-form"

export default async function PeoplePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Enhanced session user with permissions
  const user = await getSessionUserWithPermissions()

  // Fetch departments
  const departments = await db.department.findMany({
    include: {
      // Scope related users to the current org for non-superadmins
      users: user.isSuperAdmin
        ? true
        : { where: { organizationId: user.organizationId || undefined } },
    },
    orderBy: {
      name: "asc",
    },
  })

  // Fetch all users
  const users = await db.user.findMany({
    where: user.isSuperAdmin ? undefined : { organizationId: user.organizationId || undefined },
    include: {
      department: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  console.log(session,'session')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">People</h2>
        {/* Org admins can add people within their organization */}
        {user.organizationId && hasPermission(user.role, 'ORG_USERS_MANAGE', user.isSuperAdmin) ? (
          <div className="hidden md:block">
            {/* Placeholder for possible future link-based flow */}
          </div>
        ) : null}
      </div>

        {user.organizationId && hasPermission(user.role, 'ORG_USERS_MANAGE', user.isSuperAdmin) && (
          <OrgAddUserForm />
        )}

        <PeopleSearch users={users as any} departments={departments as any}  currentUser={session as any}/>

    </div>
  )
}
