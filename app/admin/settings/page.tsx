import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/org'
import { db } from '@/lib/db'

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return <div className="p-8 text-red-600">Forbidden</div>
  }
  const envList = (process.env.SUPERADMINS || '').split(',').map(s => s.trim()).filter(Boolean)
  const users = await db.user.findMany({ where: { OR: [{ isSuperAdmin: true }, { email: { in: envList } }] }, select: { id: true, name: true, email: true, isSuperAdmin: true } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage super admin users and platform settings</p>
      </div>
      <section className="rounded-lg border bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">SUPERADMINS (.env)</h2>
        </div>
        <ul className="text-sm divide-y">
          {envList.map(e => <li key={e} className="px-4 py-3 font-mono text-xs">{e}</li>)}
          {envList.length === 0 && <li className="px-4 py-3 text-muted-foreground">No emails in SUPERADMINS env.</li>}
        </ul>
      </section>
      <section className="rounded-lg border bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Super Admin Users</h2>
        </div>
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
          <form action="/api/admin/superadmins/toggle" method="post" className="flex gap-2 text-sm">
            <input name="email" placeholder="User email..." className="flex-1 h-10 rounded-lg border px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <select name="enable" className="h-10 rounded-lg border px-3 bg-white dark:bg-gray-900">
              <option value="true">Enable</option>
              <option value="false">Disable</option>
            </select>
            <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm">Save</button>
          </form>
        </div>
        <ul className="text-sm divide-y">
          {users.map((u: any) => (
            <li key={u.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.isSuperAdmin || envList.includes(u.email) ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                {u.isSuperAdmin || envList.includes(u.email) ? 'SUPER_ADMIN' : 'MEMBER'}
              </span>
            </li>
          ))}
          {users.length === 0 && <li className="px-4 py-3 text-muted-foreground">No super admin users found.</li>}
        </ul>
      </section>
    </div>
  )
}
