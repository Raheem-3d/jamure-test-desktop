"use client"
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, Search as SearchIcon, Settings, Home, LogOut, ChevronDown } from 'lucide-react'

interface AdminTopBarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function AdminTopBar({ user }: AdminTopBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'TRIAL_EXPIRING' | 'NEW_ORG' | 'IMPERSONATION'
    title: string
    description?: string
    timestamp: string
    link?: string
  }>>([])
  const [hasUnread, setHasUnread] = useState(false)

  const formatRelative = (iso: string) => {
    const now = new Date().getTime()
    const t = new Date(iso).getTime()
    const diff = Math.max(0, Math.floor((now - t) / 1000))
    if (diff < 60) return `${diff}s ago`
    const m = Math.floor(diff / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    return `${d}d ago`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/admin/organizations?q=${encodeURIComponent(searchQuery)}`
    }
  }

  // Keyboard shortcut: focus search on '/'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)
      if (!isTyping && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Load superadmin notifications
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/superadmin/notifications?limit=10', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setNotifications(data.items || [])
        setHasUnread((data.items || []).length > 0)
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/60 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
      <div className="px-4 lg:px-6 h-14 flex items-center gap-3">
        <Link href="/admin" className="lg:hidden font-semibold text-sm text-gray-700 dark:text-gray-200">Admin</Link>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <label className="sr-only" htmlFor="admin-search">Search organizations</label>
          <div className="relative">
            <input
              id="admin-search"
              name="q"
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organizations (press /)"
              className="w-full h-10 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white/80 dark:bg-gray-950/70 pl-10 pr-20 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:border-transparent"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-[11px] px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
            <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">/</kbd>
          </div>
        </form>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="relative h-9 w-9 rounded-xl bg-gray-50/60 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70">
                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[300px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 shadow-2xl p-2 backdrop-blur" sideOffset={8}>
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Notifications</p>
                </div>
                <div className="space-y-1">
                  {notifications.length === 0 && (
                    <div className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">No notifications</div>
                  )}
                  {notifications.map((n) => (
                    <DropdownMenu.Item key={n.id} asChild>
                      {n.link ? (
                        <a href={n.link} className="flex flex-col gap-1 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{n.description || formatRelative(n.timestamp)}</p>
                        </a>
                      ) : (
                        <div className="flex flex-col gap-1 px-3 py-2 rounded-md text-sm">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{n.description || formatRelative(n.timestamp)}</p>
                        </div>
                      )}
                    </DropdownMenu.Item>
                  ))}
                </div>
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
                <DropdownMenu.Item asChild>
                  <Link href="/admin/audit-logs" className="block px-3 py-2 rounded-md text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none">
                    View all activity →
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="h-9 pl-2 pr-2 rounded-full bg-gray-50/60 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70">
                {user.image ? (
                  <img src={user.image} alt={user.name || user.email || 'user'} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white grid place-items-center font-medium">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[240px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 shadow-2xl p-2 backdrop-blur" sideOffset={8} align="end">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <DropdownMenu.Item asChild>
                  <Link href="/admin/settings" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none">
                    <Home className="h-4 w-4" /> User Dashboard
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
                <DropdownMenu.Item asChild>
                  <Link href="/api/auth/signout" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none">
                    <LogOut className="h-4 w-4" /> Sign out
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  )
}
