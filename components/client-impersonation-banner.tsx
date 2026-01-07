"use client"
import { useEffect, useState } from 'react'

export default function ClientImpersonationBanner() {
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    const cookies = document.cookie.split(';').map(v => v.trim())
    for (const c of cookies) {
      if (c.startsWith('impersonation_org=')) {
        setOrgId(decodeURIComponent(c.split('=')[1] || ''))
        break
      }
    }
  }, [])

  if (!orgId) return null
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
      <div className="mx-auto max-w-screen-2xl px-6 py-2 text-sm flex items-center justify-between">
        <span>Impersonating org {orgId}</span>
        <form action="/api/admin/impersonation/exit" method="post">
          <button className="text-amber-800 dark:text-amber-300 underline" type="submit">Exit</button>
        </form>
      </div>
    </div>
  )
}
