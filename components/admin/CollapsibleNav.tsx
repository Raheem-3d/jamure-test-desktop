"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface NavItem {
  href?: string
  label: string
  icon: string
  children?: NavItem[]
}

export function CollapsibleNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-nav-expanded')
    if (saved) {
      try {
        setOpenSections(new Set(JSON.parse(saved)))
      } catch {}
    }
  }, [])

  // Save expanded state to localStorage
  const toggleSection = (label: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      localStorage.setItem('admin-nav-expanded', JSON.stringify(Array.from(next)))
      return next
    })
  }

  const isActive = (href?: string) => {
    if (!href || !pathname) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = openSections.has(item.label)
    const active = isActive(item.href)

    if (!hasChildren && item.href) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-500',
            active && 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium',
            !active && 'text-gray-700 dark:text-gray-300'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      )
    }

    return (
      <div key={item.label}>
        <button
          onClick={() => toggleSection(item.label)}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-500',
            'text-gray-700 dark:text-gray-300'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </div>
          <span className={cn('transition-transform text-xs', isExpanded && 'rotate-90')}>▶</span>
        </button>
        {isExpanded && item.children && (
          <div className="mt-1 space-y-1">
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className="space-y-1">
      {items.map(item => renderItem(item))}
    </nav>
  )
}
