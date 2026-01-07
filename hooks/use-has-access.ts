"use client"
import { useMemo } from "react"
import { useSession } from "next-auth/react"

/**
 * useHasAccess
 * Client-side role checker. Returns true if current user is superadmin or has a role in requiredRoles.
 */
export function useHasAccess(requiredRoles: string[] = []) {
  const { data } = useSession()
  const role = (data as any)?.user?.role as string | undefined
  const isSuperAdmin = Boolean((data as any)?.user?.isSuperAdmin)

  return useMemo(() => {
    if (isSuperAdmin) return true
    if (!requiredRoles?.length) return Boolean(role)
    const set = new Set(requiredRoles.map((r) => r.toUpperCase()))
    return !!(role && set.has(role.toUpperCase()))
  }, [role, isSuperAdmin, requiredRoles])
}

export default useHasAccess
