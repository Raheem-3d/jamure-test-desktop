"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  CheckSquare,
  Users,
  Settings,
  PlusCircle,
  Hash,
  Search,
  Calendar,
  Bell,
  CalendarCheck,
  LucideLayoutDashboard,
  ChevronDown,
  Building,
  Briefcase,
  Bot,
  Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocket } from "@/lib/socket-client";
import { usePermissions } from "@/lib/rbac-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";

type Channel = {
  id: string;
  name: string;
  isPublic: boolean;
  isDepartment: boolean;
};

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentTasks, setRecentTasks] = useState([]);
  const { onlineUsers } = useSocket();
  const [isTasksLoading, setIsTasksLoading] = useState([]);
  const isAdmin = session?.user?.role == "ADMIN";
  const isClient = session?.user.role == "CLIENT";
  const departments = session?.user?.departmentId;
  const [boardType, setBoardType] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  
  // Permission-based check for creating projects/channels
  const perms = usePermissions() as any
  const canCreateTask = perms.canCreateTasks
  const canCreateChannel = perms.canManageChannels || perms.canCreateChannels
  const [navigatingTo, setNavigatingTo] = useState(null);

  const fetchRecentTasks = async () => {
    try {
      const res = await fetch("/api/tasks/client");
      if (res.ok) {
        const data = await res.json();
        setRecentTasks(data?.recentTasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch("/api/channels");
        if (response.ok) {
          const data = await response.json();
          
          setChannels(data);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
    fetchRecentTasks();

    // Listen for creation events to refresh without full page reload
    const onChannelCreated = () => {
      // Re-fetch to stay consistent with server filters
      fetchChannels();
    };
    const onTaskCreated = () => {
      fetchRecentTasks();
    };

    // Listen for assignment events (when user is assigned to channel/task)
    const onChannelAssigned = () => {
      console.log("📡 Channel assigned - refreshing sidebar");
      fetchChannels();
    };
    const onTaskAssigned = () => {
      console.log("📡 Task assigned - refreshing sidebar");
      fetchRecentTasks();
    };

    window.addEventListener("channel:created", onChannelCreated as EventListener);
    window.addEventListener("task:created", onTaskCreated as EventListener);
    window.addEventListener("project:created", onTaskCreated as EventListener);
    window.addEventListener("channel:assigned", onChannelAssigned as EventListener);
    window.addEventListener("task:assigned", onTaskAssigned as EventListener);

    return () => {
      window.removeEventListener("channel:created", onChannelCreated as EventListener);
      window.removeEventListener("task:created", onTaskCreated as EventListener);
      window.removeEventListener("project:created", onTaskCreated as EventListener);
      window.removeEventListener("channel:assigned", onChannelAssigned as EventListener);
      window.removeEventListener("task:assigned", onTaskAssigned as EventListener);
    };
  }, []);



    // Fetch organization details (name) for display in header
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch('/api/organization/me');
        if (!res.ok) return;
        const payload = await res.json();
        const name = payload?.organization?.name || null;
        setOrgName(name);
      } catch (err) {
        console.error('Failed to fetch organization:', err);
      }
    };

    fetchOrg();
  }, []);

  let navItems = [];

  if (isClient) {
    navItems = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: <LucideLayoutDashboard className="h-5 w-5" />,
      },
      {
        title: "AI Assistant",
        href: "/dashboard/ai-assistant",
        icon: <Bot className="h-5 w-5" />,
        badge: <Sparkles className="h-3 w-3 text-yellow-500" />,
      },
      {
        title: "Calendar",
        href: "/dashboard/calendar",
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        title: "Notifications",
        href: "/dashboard/notification",
        icon: <Bell className="h-5 w-5" />,
      },
      {
        title: "Reminders",
        href: "/dashboard/reminders",
        icon: <CalendarCheck className="h-5 w-5" />,
      },
    ];
  } else {
    navItems = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: <LucideLayoutDashboard className="h-5 w-5" />,
      },
      {
        title: "AI Assistant",
        href: "/dashboard/ai-assistant",
        icon: <Bot className="h-5 w-5" />,
        badge: <Sparkles className="h-3 w-3 text-yellow-500" />,
      },
      {
        title: "Calendar",
        href: "/dashboard/calendar",
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        title: "Notifications",
        href: "/dashboard/notification",
        icon: <Bell className="h-5 w-5" />,
      },
      {
        title: "Reminders",
        href: "/dashboard/reminders",
        icon: <CalendarCheck className="h-5 w-5" />,
      },
    ];
  }

  // 

  const filteredChannels = channels.filter((channel) => {
    const name = channel.name.toLowerCase();
    const query = searchQuery.toLowerCase();

    return (
      !name.startsWith("task") &&
      !name.includes("internal") &&
      name.includes(query)
    );
  });

  

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-40 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              {/* <Building className="h-5 w-5 text-white" /> */}
            </div>
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {orgName || (session as any)?.user?.organizationName || "3D Power"}
            </h2>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Building className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed && "-rotate-90"
            )}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Main Navigation */}
          <nav className="space-y-1 mb-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                 prefetch={true}
                className={cn(
                  "flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                  pathname === item.href
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <div
                  className={cn(
                    "transition-colors",
                    pathname === item.href
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  )}
                >
                  {item.icon}
                </div>
                {!isCollapsed && <span className="ml-3">{item.title}</span>}
              </Link>
            ))}
          </nav>

          {/* Projects/Board Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isClient ? "Projects" : "Workspace"}
                </h3>
              )}
              
<div className="relative flex items-center space-x-1">
  {!isCollapsed && !isClient && (canCreateTask || canCreateChannel) && (
    <>
    
      <div className="relative">
        {(canCreateTask || canCreateChannel) && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-300 shadow-sm hover:shadow-md border border-green-100 group"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <PlusCircle className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            </Button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden animate-fadeIn">
                {canCreateTask && (
                  <Link
                    href="/dashboard/tasks/new"
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Project
                  </Link>
                )}


             
                {canCreateChannel && (
                  <Link
                    href="/dashboard/new-channel"
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Create Channel
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )}
</div>
            </div>

            {isClient ? (
              <div className="space-y-3">
                {!isCollapsed && (
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                )}
                <div className="space-y-1">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"
                        />
                      ))
                    : recentTasks.length > 0
                    ? recentTasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/dashboard/tasks/${task.id}/record`}
                          className={cn(
                            "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                            pathname === `/dashboard/tasks/${task.id}`
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <Briefcase className="h-4 w-4 mr-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                          {!isCollapsed && (
                            <span className="truncate flex-1">
                              {task.title}
                            </span>
                          )}
                        </Link>
                      ))
                    : !isCollapsed && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                          No projects
                        </p>
                      )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {!isCollapsed && (
                  <Select value={boardType} onValueChange={setBoardType}>
                    <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="projects">Projects</SelectItem>
                      <SelectItem value="channels">Channels</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="space-y-1">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"
                        />
                      ))
                    : boardType === "projects"
                    ? recentTasks.length > 0
                      ? recentTasks.map((task) => (
                          <Link
                            key={task.id}
                            href={`/dashboard/tasks/${task.id}/record`}
                              prefetch={true} // या prefetch="viewport" (Next.js 15+)
                            className={cn(
                              "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                              pathname === `/dashboard/tasks/${task.id}`
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            <Briefcase className="h-4 w-4 mr-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                            {!isCollapsed && (
                              <span className="truncate flex-1">
                                {task.title}
                              </span>
                            )}
                          </Link>
                        ))
                      : !isCollapsed && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                            No projects
                          </p>
                        )
                    : filteredChannels.length > 0
                    ? filteredChannels.map((channel) => (
                        <Link
                          key={channel.id}
                          href={`/dashboard/channels/${channel.id}`}
                          prefetch={true}
                          className={cn(
                            "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                            pathname === `/dashboard/channels/${channel.id}`
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <Hash className="h-4 w-4 mr-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                          {!isCollapsed && (
                            <>
                              <span className="truncate flex-1">
                                {channel.name.charAt(0).toUpperCase() +
                                  channel.name.slice(1)}
                              </span>
                            
                            </>
                          )}
                        </Link>
                      ))
                    : !isCollapsed && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                          No channels
                        </p>
                      )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 bg-green-500"></div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email || ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

