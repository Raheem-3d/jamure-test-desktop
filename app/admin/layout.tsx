

import { ReactNode } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/org'
import { ThemeToggle } from '@/components/theme-toggle'
import ClientImpersonationBanner from '@/components/client-impersonation-banner'
import { CollapsibleNav, NavItem } from '@/components/admin/CollapsibleNav'
import AdminTopBar from '@/components/admin/AdminTopBar'

// Modern Lucide-style icons as SVG components
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10" />
    </svg>
  ),
  Organizations: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8v-5m0 5h4" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5m0 5h4" />
    </svg>
  ),
  Trials: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Audit: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Analytics: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any) as any
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-950">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Access Restricted</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need super admin privileges to access this area.</p>
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const navItems: NavItem[] = [
    { 
      href: '/admin', 
      label: 'Dashboard', 
      icon: <Icons.Dashboard />,
      description: 'Platform overview and metrics'
    },
    {
      label: 'Organizations',
      icon: <Icons.Organizations />,
      description: 'Manage organizations and teams',
      children: [
        { 
          href: '/admin/organizations', 
          label: 'All Organizations', 
          icon: <Icons.Building />,
          description: 'View and manage all organizations'
        },
        { 
          href: '/admin/trials', 
          label: 'Trials', 
          icon: <Icons.Trials />,
          description: 'Manage trial accounts and expiration'
        },
      ],
    },
    {
      label: 'Activity',
      icon: <Icons.Activity />,
      description: 'Monitor platform activity',
      children: [
        { 
          href: '/admin/audit-logs', 
          label: 'Audit Logs', 
          icon: <Icons.Audit />,
          description: 'System audit trail and events'
        },
        { 
          href: '/admin/analytics', 
          label: 'Analytics', 
          icon: <Icons.Analytics />,
          description: 'Platform usage analytics'
        },
      ],
    },
    { 
      href: '/admin/settings', 
      label: 'Settings', 
      icon: <Icons.Settings />,
      description: 'System configuration'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="min-h-screen flex">
        {/* Collapsible Sidebar */}
        <aside className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-gray-200/60 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out w-80 hover:w-80 group/sidebar">
          
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200/60 dark:border-gray-800">
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25 flex items-center justify-center">
                <span className="text-white font-bold text-sm">SA</span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate">Super Admin</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate">Platform Control Center</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <nav className="space-y-1">
              <CollapsibleNav items={navItems} />
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-gray-200/60 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <div className="flex items-center justify-between mb-3">
              {/* <ThemeToggle /> */}
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Live</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              v1.0.0 • © {new Date().getFullYear()}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Trigger */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
            <Icons.Menu />
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          <AdminTopBar user={session.user} />
          <ClientImpersonationBanner />
          
          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6">
            <div className="mx-auto w-full">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 min-h-[calc(100vh-140px)]">
                <div className="p-6 lg:p-8">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}