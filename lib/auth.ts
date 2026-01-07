import { PrismaAdapter } from "@next-auth/prisma-adapter"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { isSuperAdmin } from "@/lib/org"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login page with error instead of default error page
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { organization: { include: { subscription: true } } },
        })

        if (!user) {
          return null
        }

        if (!user.password) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          organizationId: user.organizationId,
          isSuperAdmin: user.isSuperAdmin,
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      const s: any = session as any
      if (token) {
        s.user = s.user || {}
        s.user.id = token.id as string
        s.user.name = token.name
        s.user.email = token.email
        s.user.role = token.role as string
        s.user.permissions = (token as any).permissions || []
        s.user.departmentId = token.departmentId as string | null
        s.user.organizationId = (token as any).organizationId || null
        s.user.isSuperAdmin = (token as any).isSuperAdmin || false
        s.subscriptionStatus = (token as any).subscriptionStatus || null
        s.subscriptionEnd = (token as any).subscriptionEnd || null
        s.organizationSuspended = (token as any).organizationSuspended || false
      }
      return s
    },
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: { email: token.email as string },
        include: { organization: { include: { subscription: true } }, },
      })

      if (!dbUser) {
        if (user) {
          token.id = user.id
        }
        return token
      }

      // Check if user is super admin
      const userIsSuperAdmin = dbUser.isSuperAdmin || isSuperAdmin(dbUser.email)

      // Organization-level subscription snapshot
      const subscription = dbUser.organization?.subscription || null

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        permissions: dbUser.permissions || [],
        departmentId: dbUser.departmentId,
        organizationId: dbUser.organizationId,
        isSuperAdmin: userIsSuperAdmin,
        subscriptionStatus: subscription?.status || null,
        subscriptionEnd: subscription?.status === "TRIAL" ? subscription.trialEnd : subscription?.currentPeriodEnd || null,
        organizationSuspended: (dbUser.organization as any)?.suspended === true,
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
}
