


"use client"

import { useState, useEffect } from "react"
import { 
  Bell, 
  BellOff, 
  Check, 
  Settings, 
  X, 
  Filter, 
  Search, 
  Archive,
  CheckCircle2,
  MessageSquare,
  Calendar,
  AlertCircle,
  Users,
  MoreHorizontal,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationsPanel } from "@/components/notifications-panel"
import { useNotifications } from "@/contexts/notifications-context"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
export default function NotificationPage() {
    const { unreadCount, markAllAsRead, notifications } = useNotifications()
    const [open, setOpen] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [hasNewNotification, setHasNewNotification] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "read">("all")
    const router = useRouter();
    useEffect(() => {
        setMounted(true)
        const savedMuteState = typeof window !== 'undefined'
            ? localStorage.getItem('notificationsMuted')
            : null
        setIsMuted(savedMuteState === 'true')
    }, [])

    useEffect(() => {
        if (mounted) {
            localStorage.setItem('notificationsMuted', String(isMuted))
        }
    }, [isMuted, mounted])

    useEffect(() => {
        if (mounted && unreadCount > 0) {
            setHasNewNotification(true)
            const timer = setTimeout(() => setHasNewNotification(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [unreadCount, mounted])

    const handleMarkAllAsRead = () => {
        markAllAsRead()
    }

    const toggleMute = () => {
        setIsMuted(!isMuted)
    }

    // Filter notifications based on search query and active filter
    const filteredNotifications = notifications.filter(notification => {
        // Search filter
        const matchesSearch = notification.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             notification.type.toLowerCase().includes(searchQuery.toLowerCase())
        
        // Status filter
        const matchesStatus = 
            activeFilter === "all" || 
            (activeFilter === "unread" && !notification.read) ||
            (activeFilter === "read" && notification.read)
        
        return matchesSearch && matchesStatus
    })

    // Get notification icon based on type
    const getNotificationIcon = (type: string) => {
        if (type.toLowerCase() === 'announcement' || type.includes('ANNOUNCEMENT')) {
            return <AlertCircle className="h-4 w-4 text-amber-600" />
        }
        switch (type.toLowerCase()) {
            case 'message':
                return <MessageSquare className="h-4 w-4 text-blue-600" />
            case 'task':
            case 'task_assigned':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />
            case 'event':
            case 'calendar':
                return <Calendar className="h-4 w-4 text-purple-600" />
            case 'alert':
            case 'urgent':
                return <AlertCircle className="h-4 w-4 text-red-600" />
            case 'team':
            case 'user':
                return <Users className="h-4 w-4 text-orange-600" />
            default:
                return <Bell className="h-4 w-4 text-gray-600" />
        }
    }

    // Stats for the sidebar
    const notificationStats = {
        total: notifications.length,
        unread: unreadCount,
        read: notifications.length - unreadCount,
        today: notifications.filter(n => {
            const today = new Date()
            const notificationDate = new Date(n.createdAt)
            return notificationDate.toDateString() === today.toDateString()
        }).length
    }

    if (!mounted) {
        return (
            <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2"></div>
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse"></div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            <div className="h-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto ">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                   

                    <div>
                            <Button
      variant="outline"
      size="sm"
      className="h-10 w-10 p-0 mx-2"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Notifications</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Stay updated with your latest activities and mentions
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search notifications..."
                                className="pl-10 pr-4 w-full sm:w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-700">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                        {activeFilter !== "all" && (
                                            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                                                {activeFilter === "unread" ? unreadCount : notifications.length - unreadCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end">
                                    <div className="space-y-1">
                                        <Button 
                                            variant={activeFilter === "all" ? "secondary" : "ghost"} 
                                            className="w-full justify-start"
                                            onClick={() => setActiveFilter("all")}
                                        >
                                            All Notifications
                                            <Badge variant="outline" className="ml-auto">{notifications.length}</Badge>
                                        </Button>
                                        <Button 
                                            variant={activeFilter === "unread" ? "secondary" : "ghost"} 
                                            className="w-full justify-start"
                                            onClick={() => setActiveFilter("unread")}
                                        >
                                            Unread
                                            <Badge variant="outline" className="ml-auto">{unreadCount}</Badge>
                                        </Button>
                                        <Button 
                                            variant={activeFilter === "read" ? "secondary" : "ghost"} 
                                            className="w-full justify-start"
                                            onClick={() => setActiveFilter("read")}
                                        >
                                            Read
                                            <Badge variant="outline" className="ml-auto">{notifications.length - unreadCount}</Badge>
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="border-gray-200 dark:border-gray-700">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleMarkAllAsRead}>
                                        <Check className="h-4 w-4 mr-2" />
                                        Mark all as read
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={toggleMute}>
                                        {isMuted ? (
                                            <Bell className="h-4 w-4 mr-2" />
                                        ) : (
                                            <BellOff className="h-4 w-4 mr-2" />
                                        )}
                                        {isMuted ? 'Unmute all' : 'Mute all'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 dark:bg-gray-900">
                    {/* Notification List */}
                    <div className="lg:col-span-3 space-y-4 ">
                        <Card className="border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900 ">
                            <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg text-gray-900 dark:text-white">
                                        Your Notifications
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={isMuted ? "destructive" : "outline"} className={cn(
                                            "text-xs",
                                            !isMuted && "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                        )}>
                                            {isMuted ? 'Muted' : 'Active'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 dark:bg-gray-900">
                                <Tabs defaultValue="all" className="w-full">
                                    <div className="border-b border-gray-100 dark:border-gray-700">
                                        <TabsList className="w-full grid grid-cols-3 rounded-none border-0 bg-transparent p-0">
                                            <TabsTrigger 
                                                value="all" 
                                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-4"
                                            >
                                                All
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    {notifications.length}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger 
                                                value="unread" 
                                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-4"
                                            >
                                                Unread
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    {unreadCount}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger 
                                                value="archived" 
                                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-4"
                                            >
                                                Archived
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="all" className="m-0 dark:bg-gray-900">
                                        <NotificationsPanel 
                                            notifications={filteredNotifications} 
                                            showEmptyState={filteredNotifications.length === 0}
                                        />
                                    </TabsContent>

                                    <TabsContent value="unread" className="m-0">
                                        <NotificationsPanel 
                                            notifications={filteredNotifications.filter(n => !n.read)} 
                                            showEmptyState={filteredNotifications.filter(n => !n.read).length === 0}
                                        />
                                    </TabsContent>

                                    <TabsContent value="archived" className="m-0">
                                        <div className="p-8 text-center">
                                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No archived notifications</h3>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                Archived notifications will appear here
                                            </p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card className="border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg text-gray-900 dark:text-white">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start gap-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={handleMarkAllAsRead}
                                    disabled={unreadCount === 0}
                                >
                                    <Check className="h-4 w-4" />
                                    Mark all as read
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start gap-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={toggleMute}
                                >
                                    {isMuted ? (
                                        <Bell className="h-4 w-4" />
                                    ) : (
                                        <BellOff className="h-4 w-4" />
                                    )}
                                    {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Notification Stats */}
                        <Card className="border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900 ">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg text-gray-900 dark:text-white">Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notificationStats.total}</div>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total</div>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{notificationStats.unread}</div>
                                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Unread</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{notificationStats.read}</div>
                                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">Read</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{notificationStats.today}</div>
                                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Today</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notification Settings */}
                        {/* <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg text-gray-900 dark:text-white">Settings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full justify-start gap-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" asChild>
                                    <a href="/dashboard/settings/notifications">
                                        <Settings className="h-4 w-4" />
                                        Notification Preferences
                                    </a>
                                </Button>
                            </CardContent>
                        </Card> */}
                    </div>
                </div>
            </div>
        </div>
    )
}