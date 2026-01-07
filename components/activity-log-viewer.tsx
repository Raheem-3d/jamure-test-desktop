import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function ActivityLogViewer() {
  const session = (await getServerSession(authOptions as any)) as any
  const orgId = session?.user?.organizationId
  if (!orgId) return null
  const logs = await db.activityLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">Recent Activity</h2>
      <ul className="text-sm">
        {logs.map((l: any) => (
          <li key={l.id} className="py-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-600 dark:text-gray-400">{new Date(l.createdAt).toLocaleString()}:</span> {l.action}
          </li>
        ))}
      </ul>
    </div>
  )
}


