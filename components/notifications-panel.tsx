
"use client";

import { useState } from "react";
import { useNotifications } from "@/contexts/notifications-context";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  Trash2,
  MessageSquare,
  CheckSquare,
  Users,
  Hash,
  AlertCircle,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";

interface NotificationsPanelProps {
  notifications?: any[];
  showEmptyState?: boolean;
}

export function NotificationsPanel({
  notifications: propNotifications,
  showEmptyState = false,
}: NotificationsPanelProps) {
  const {
    notifications: contextNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const { data: session } = useSession();
  const currentUserId = (session as any)?.user?.id as string | undefined;

  const notifications = propNotifications || contextNotifications;
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "messages") return notification.type.includes("MESSAGE");
    if (activeTab === "tasks") return notification.type.includes("TASK");
    if (activeTab === "reminder") return notification.type.includes("REMINDER");
    return true;
  });

  const getNotificationIcon = (type: string) => {
    if (type.includes('ANNOUNCEMENT')) {
      return <AlertCircle className="h-4 w-4 text-amber-600" />
    }
    if (type.includes("MESSAGE")) {
      return type.includes("CHANNEL") ? (
        <Hash className="h-4 w-4 text-blue-600" />
      ) : (
        <MessageSquare className="h-4 w-4 text-green-600" />
      );
    }
    if (type.includes("TASK")) {
      if (type.includes("DUE"))
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      if (type.includes("COMPLETED"))
        return <CheckSquare className="h-4 w-4 text-green-600" />;
      if (type.includes("ASSIGNED"))
        return <Users className="h-4 w-4 text-blue-600" />;
      if (type.includes("REMINDER"))
        return <Calendar className="h-4 w-4 text-purple-600" />;
      return <CheckSquare className="h-4 w-4 text-gray-600" />;
    }
    if (type.includes("USER"))
      return <Users className="h-4 w-4 text-indigo-600" />;
    return <Bell className="h-4 w-4 text-gray-600" />;
  };

  const getNotificationLink = (notification: any) => {

    console.log(notification,'notificationnnnnnnnnn')
    if (notification.type && notification.type.includes('ANNOUNCEMENT')) {
      if (notification.announcementId && notification.organizationId) {
        return `/org/${notification.organizationId}/announcements/${notification.announcementId}`
      }
      if (notification.announcementId) {
        return `/org/${notification.announcementId}/announcements/${notification.announcementId}`
      }
    }
    if (notification.type === "CHANNEL_MESSAGE") {
      return `/dashboard/channels/${notification.channelId}`;
    }
    if (notification.type === "DIRECT_MESSAGE") {
      // Prefer sender, then receiver, then messageId; avoid routing to self
      const candidates = [
        notification.senderId,
        notification.receiverId,
        notification.messageId,
      ].filter(Boolean) as string[];

      // pick first id that is not current user; else first candidate; else fallback to inbox
      const targetId = candidates.find((id) => !currentUserId || id !== currentUserId) || candidates[0];
      return targetId ? `/dashboard/messages/${targetId}` : `/dashboard/messages`;
    }
    
    if (notification.type === "TASK_ASSIGNED") {
      return `/dashboard/tasks/${notification.taskId || notification.id}`;
    }
    if (notification.type === "CHANNEL") {
      return `/dashboard/channels/${notification.channelId || notification.id}`;
    }
     if (notification.type === "CHANNEL_INVITE") {
      return `/dashboard/channels/${notification.channelId || notification.id}`;
    }
    if (notification.type === "USER") {
      return `/dashboard/messages/${notification.senderId || notification.id}`;
    }
    if (notification.type === "REMINDER") {
      return `/dashboard/reminders`;
    }
    return "#";
  };

  const getTaskStatus = (type: string) => {
    if (type.includes("DUE")) {
      return {
        text: "Due Soon",
        class:
          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300",
      };
    }
    if (type.includes("COMPLETED")) {
      return {
        text: "Completed",
        class:
          "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300",
      };
    }
    if (type.includes("ASSIGNED")) {
      return {
        text: "Assigned",
        class:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
      };
    }
    if (type.includes("REMINDER")) {
      return {
        text: "Reminder",
        class:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300",
      };
    }
    return {
      text: "Task",
      class:
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    };
  };
  
  const getNotificationTypeColor = (type: string) => {
    if (type.includes('ANNOUNCEMENT'))
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
    if (type.includes("MESSAGE"))
      return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
    if (type.includes("TASK"))
      return "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400";
    if (type.includes("REMINDER"))
      return "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400";
    return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900 w-full">
      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between w-fit">
          <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600 mr-6" />
        
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-blue-600 text-white">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearNotifications}
              disabled={notifications.length === 0}
              className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-gray-100 dark:border-gray-700">
            <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                All
                <Badge variant="secondary" className="ml-2 text-xs">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                Messages
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                Tasks
              </TabsTrigger>
              <TabsTrigger
                value="reminder"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                Reminders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[400px]">
              {showEmptyState || filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    No notifications
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {activeTab === "all"
                      ? "You're all caught up!"
                      : `No ${activeTab} notifications found`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredNotifications.map((notification) => {
                    const taskStatus = notification.type.includes("TASK")
                      ? getTaskStatus(notification.type)
                      : null;
                    const isAnnouncement = notification.type.includes('ANNOUNCEMENT')

                    return (
                      <Link
                        key={notification.id}
                        href={getNotificationLink(notification)}
                        onClick={() => markAsRead(notification.id)}
                        className={cn(
                          "flex items-start gap-4 p-4 transition-colors group",
                          !notification.read
                            ? "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2",
                            !notification.read
                              ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                              : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                          )}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm leading-relaxed",
                                !notification.read
                                  ? "text-gray-900 dark:text-white font-medium"
                                  : "text-gray-700 dark:text-gray-300"
                              )}
                            >
                              {notification.content}
                            </p>
                            {!notification.read && (
                              <Badge
                                variant="default"
                                className="bg-blue-600 text-white flex-shrink-0"
                              >
                                New
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                getNotificationTypeColor(notification.type),
                                isAnnouncement && 'ring-1 ring-amber-300 dark:ring-amber-700'
                              )}
                            >
                              {notification.type
                                .replace(/_/g, " ")
                                .toLowerCase()}
                            </Badge>

                            {taskStatus && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs", taskStatus.class)}
                              >
                                {taskStatus.text}
                              </Badge>
                            )}

                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
