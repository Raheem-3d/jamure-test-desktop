"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  user: any
  isSuperAdmin: boolean
  isOrgAdmin: boolean
  organizationId: string | null
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  isSuperAdmin: false,
  isOrgAdmin: false,
  organizationId: null,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const router = useRouter()

  // console.log('session.user as any',session )
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const sessionUser = session.user as any
      setIsAuthenticated(true)
      setUser(sessionUser)
      setIsSuperAdmin(sessionUser?.isSuperAdmin || false)
      setOrganizationId(sessionUser?.organizationId || null)
      
      // Check if user is org admin
      const adminRoles = ["ORG_ADMIN", "SUPER_ADMIN"]
      setIsOrgAdmin(adminRoles.includes(sessionUser?.role?.toUpperCase()))
    } else if (status === "unauthenticated") {
      setIsAuthenticated(false)
      setUser(null)
      setIsSuperAdmin(false)
      setIsOrgAdmin(false)
      setOrganizationId(null)
    }
  }, [session, status])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: status === "loading",
        user,
        isSuperAdmin,
        isOrgAdmin,
        organizationId,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
