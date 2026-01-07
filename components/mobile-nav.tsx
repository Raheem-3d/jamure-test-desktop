"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, CheckSquare, Users, Settings, Menu, X, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Tasks",
      href: "/dashboard/tasks",
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      title: "People",
      href: "/dashboard/people",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white z-10">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 ${
              pathname === item.href ? "text-blue-600" : "text-gray-600"
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.title}</span>
          </Link>
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3">
              <Menu className="h-5 w-5" />
              <span className="text-xs mt-1">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Office Chat</h2>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-500">{user?.email || ""}</p>
                  </div>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Channels</h3>
                <div className="space-y-1">
                  <Link
                    href="/dashboard/channels/general"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    <span className="truncate">general</span>
                  </Link>
                  <Link
                    href="/dashboard/channels/random"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    <span className="truncate">random</span>
                  </Link>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
