import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Public routes that don't require a subscription
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/free-trial",
  "/forgot-password",
  "/preview",
  "/api",
  "/api/organizations",
  "/api/upload", // Allow large file uploads without middleware restrictions
  "/u/billing", // allow billing
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // ⚠️ CRITICAL: Skip middleware entirely for upload routes to avoid body size limits
  // Middleware has a 10MB limit that can't be configured in Next.js
  if (pathname.startsWith("/api/upload")) {
    // Let the request pass directly to the handler without any middleware processing
    // This is necessary because middleware applies Next.js's 10MB default limit
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Apply Security Headers to ALL requests
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // CORS for API routes
  if (pathname.startsWith("/api/")) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ]
    const origin = req.headers.get("origin")
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
    }
    
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }

  // Skip public paths quickly
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return response
  }

  // Only protect app areas (dashboard/pages) — tweak as needed
  const protect = pathname.startsWith("/dashboard") || pathname.startsWith("/u/") || pathname.startsWith("/org")
  if (!protect) {
    return response
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    // Not signed in — redirect to login
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // Super admins (or active impersonation) can always pass through protected areas
  const email = (token as any)?.email as string | undefined
  const superAdmins = (process.env.SUPERADMINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isSuper = !!email && superAdmins.includes(email.toLowerCase())
  const hasImpersonation = !!req.cookies.get("impersonation_org")?.value
  if (isSuper || hasImpersonation) {
    return response
  }

  // Read subscription snapshot from token (set in auth callbacks)
  const status = (token as any).subscriptionStatus as string | null
  const suspended = !!(token as any).organizationSuspended

  // Suspended or expired organizations: only allow billing/settings pages
  if (!suspended && (status === "TRIAL" || status === "ACTIVE")) {
    return response
  }

  if (pathname.startsWith("/u/billing") || pathname.startsWith("/u/settings")) {
    return response
  }

  const url = req.nextUrl.clone()
  url.pathname = "/u/billing"
  url.searchParams.set("reason", suspended ? "suspended" : "subscription")
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    // Apply to most routes except:
    // - Next.js internals and static assets
    // - Upload routes (they have their own request handling without middleware limits)
    "/((?!_next/|api/upload|.*\\.\
(?:css|js|png|jpg|jpeg|gif|svg|ico)|sw\\.js|uploads/).*)",
  ],
}
