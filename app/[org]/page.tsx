import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"
import { isSuperAdmin as isSuperAdminEnv } from "@/lib/org"
import DashboardPage from "@/app/dashboard/page"
import Link from "next/link"

export default async function OrgRootPage({ params }: { params: { org: string } }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) redirect("/login")

  const slug = params.org

  const organization = await db.organization.findUnique({
    where: { slug },
    select: { id: true, name: true },
  })
  if (!organization) return notFound()

  const currentUser = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, organizationId: true, isSuperAdmin: true },
  })
  if (!currentUser) redirect("/login")

  const hasImpersonation = !!cookies().get("impersonation_org")?.value
  const isSuper = currentUser.isSuperAdmin || isSuperAdminEnv(session.user.email) || hasImpersonation
  const isMember = currentUser.organizationId === organization.id

  if (!isSuper && !isMember) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-sm text-muted-foreground">You don't have access to this organization.</p>
          <Link className="text-blue-600 underline" href="/">Go Home</Link>
        </div>
      </div>
    )
  }

  // Render the same dashboard experience under pretty org URL
  return <DashboardPage />
}
