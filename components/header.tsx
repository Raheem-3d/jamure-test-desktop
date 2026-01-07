
"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  X,
  MessageSquare,
  CheckSquare,
  Hash,
  Menu,
  CalendarCheck,
  Users,
  ClockAlert,
  ChevronDown,
  Building,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/lib/socket-client";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { TaskCalendarWidget } from "./task-calendar-widget";
import { NotificationsButton } from "./notifications-button";
import { ThemeCustomizer } from "./theme-customizer";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenuSub } from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [title, setTitle] = useState("Dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Set title based on pathname
    const titleMap: { [key: string]: string } = {
      "/dashboard": "Dashboard",
      "/dashboard/tasks": "Projects",
      "/dashboard/people": "Team",
      "/dashboard/settings": "Settings",
      "/dashboard/channels": "Channels",
      "/dashboard/calendar": "Calendar",
      "/dashboard/notification": "Notifications",
      "/dashboard/reminders": "Reminders",
    };

    const matchedPath = Object.keys(titleMap).find(path => 
      pathname?.startsWith(path)
    );

    setTitle(matchedPath ? titleMap[matchedPath] : "Workspace");

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [pathname]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      toast({
        title: "New Notification",
        description: notification.content,
      });
    };

    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [isConnected, socket, toast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // const handleLogout = async () => {
  //   await signOut({ callbackUrl: "/" });
  // };

    const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reload the current page
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing:", error);
      toast({
        title: "Error",
        description: "Failed to refresh page",
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Failed to search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
        toast({
          title: "Success",
          description: "All notifications marked as read",
        });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Section - Logo and Navigation */}
        <div className="flex items-center gap-6">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="flex h-full flex-col">
                <div className="mb-8 flex items-center space-x-3 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user?.image || ""}
                      alt={user?.name || ""}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <nav className="flex-1 space-y-2">
                  {[
                    { href: "/dashboard", label: "Dashboard" },
                    { href: "/dashboard/tasks", label: "Projects" },
                    { href: "/dashboard/people", label: "Team" },
                    { href: "/dashboard/calendar", label: "Calendar" },
                    { href: "/dashboard/notification", label: "Notifications" },
                    { href: "/dashboard/reminders", label: "Reminders" },
                    { href: "/dashboard/settings", label: "Settings" },
                  ].map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                        pathname === item.href && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      )}
                      asChild
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </Button>
                  ))}
                </nav>

                <div className="mt-auto border-t border-gray-200 dark:border-gray-700 pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Jamure Chat App</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
                  {title}
                </p>
              </div>
            </div>
            
            {/* Current page title - mobile */}
            <span className="md:hidden text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects, messages, people..."
                className="pl-10 pr-4 h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Search Results</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowSearchResults(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700 last:border-b-0"
                        onClick={() => {
                          if (result.type === "message") {
                            if (result.channelId) {
                              router.push(`/dashboard/channels/${result.channelId}`);
                            } else if (result.senderId !== currentUserId) {
                              router.push(`/dashboard/messages/${result.senderId}`);
                            } else if (result.receiverId) {
                              router.push(`/dashboard/messages/${result.receiverId}`);
                            }
                          } else if (result.type === "task") {
                            router.push(`/dashboard/tasks/${result.id}`);
                          } else if (result.type === "channel") {
                            router.push(`/dashboard/channels/${result.id}`);
                          } else if (result.type === "user") {
                            router.push(`/dashboard/messages/${result.id}`);
                          }
                          setShowSearchResults(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            result.type === "message" && "bg-blue-100 dark:bg-blue-900/30",
                            result.type === "task" && "bg-green-100 dark:bg-green-900/30",
                            result.type === "channel" && "bg-purple-100 dark:bg-purple-900/30",
                            result.type === "user" && "bg-orange-100 dark:bg-orange-900/30"
                          )}>
                            {result.type === "message" && (
                              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                            {result.type === "task" && (
                              <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                            {result.type === "channel" && (
                              <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            )}
                            {result.type === "user" && (
                              <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {result.title || result.name || result.content}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {result.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-3">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  placeholder="Search projects, messages..."
                  className="pl-9 pr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  </div>
                )}
              </form>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action buttons  */}
          <div className="flex items-center gap-1">
            {/* Calendar Widget */}
            <div className="hidden sm:block ">
              <TaskCalendarWidget />
            </div>

            {/* Reminders */}
            <div className="hidden sm:block">
              <Link
                href="/dashboard/reminders"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <CalendarCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reminders</span>
              </Link>
            </div>

            {/* Quick Reminder */}
            <div className="hidden sm:block">
              <Link
                href="/dashboard/reminders/create"
                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
                title="Create Reminder"
              >
                <ClockAlert className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Link>
            </div>

            {/* Refresh Button */}
            <div className="hidden sm:block">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh page"
              >
                <RotateCcw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Notifications */}
            <div className="hidden sm:block">
              <NotificationsButton />
            </div>

            {/* Theme Customizer */}
            <div className="hidden sm:block">
              <ThemeCustomizer />
            </div>

            {/* Team */}
            <Link href="/dashboard/people" className="hidden sm:flex">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
            </Link>

            {/* Help */}
            {/* <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex">
              <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button> */}

            {/* User Menu */}
            <DropdownMenu >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Avatar className="h-7 w-7 mr-2">
                    <AvatarImage
                      src={user?.image || ""}
                      alt={user?.name || ""}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500 ml-1 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 dark:bg-gray-900">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-700">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user?.image || ""}
                      alt={user?.name || ""}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Menu Items */}
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Profile & Account</span>
                  </Link>
                </DropdownMenuItem>

                {/* <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings/preferences" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Preferences</span>
                  </Link>
                </DropdownMenuItem> */}

                <DropdownMenuSeparator />

                {/* Theme Toggle */}
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}



 

