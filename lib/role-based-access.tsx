"use client"

import { useAuth } from "@/contexts/auth-context"
import type { ReactNode } from "react"

type RoleBasedAccessProps = {
  allowedRoles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleBasedAccess({ allowedRoles, children, fallback = null }: RoleBasedAccessProps) {
  const { user } = useAuth()

if (!user) {
    console.log("No user found")
    return fallback
  }

  const hasAccess = allowedRoles.map(r => r.toLowerCase()).includes(user.role.toLowerCase())
     console.log(hasAccess,'hasAccess')

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

