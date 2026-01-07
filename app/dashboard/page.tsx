

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Hash,
  PlusCircle,
  CheckCircle,
  MessageSquare,
  Users,
  ArrowRight,
  Calendar,
  ChevronRight,
  Briefcase,
  BarChart3,
  Activity,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Sun,
  LayoutDashboard,
} from "lucide-react";
import TaskCard from "@/components/task-card";
import ProjectPage from "@/components/ProjectPage";
import { cn } from "@/lib/utils";
import SubscriptionBanner from "@/components/subscription-banner";
import DashboardCharts from "@/components/dashboard-charts";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      department: true,
    },
  });

  const isAdmin = session.user?.role === "ORG_ADMIN";
  const isClient = session.user?.role === "CLIENT";
  const isEmployee = session.user?.role === "EMPLOYEE";
  const userId = session.user.id;

  // Client: recent channels
  const recentChannelsForClient = await db.channel.findMany({
    where: {
      members: {
        some: {
          userId: userId,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 5,
    include: {
      department: true,
      _count: {
        select: { messages: true },
      },
    },
  });

  // Assignee: get task IDs assigned to user
  const assignedTaskIds = await db.taskAssignment.findMany({
    where: { userId: userId },
    select: { taskId: true },
  });
  const taskIds = assignedTaskIds.map((t) => t.taskId);

  const recentChannelsForAssignee = await db.channel.findMany({
    where: {
      members: {
        some: { userId },
      },
      NOT: [
        { name: { contains: "internal" } },
        { name: { startsWith: "task" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      department: true,
      _count: { select: { messages: true } },
    },
  });

  let recentChannels = [];

  if (user?.role === "ORG_ADMIN") {
    recentChannels = recentChannelsForAssignee;
  } else if (user?.role === "CLIENT") {
    recentChannels = recentChannelsForClient;
  } else {
    recentChannels = recentChannelsForAssignee;
  }

  // Fetch recent tasks
  const recentTasks = await db.task.findMany({
    where: {
      OR: [
        { creatorId: session.user.id },
        {
          assignments: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      creator: true,
      assignments: {
        include: {
          user: true,
        },
      },
      channel: true,
    },
  });

  // Fetch recent direct messages
  const recentDirectMessages = await db.message.findMany({
    where: {
      OR: [
        {
          senderId: session.user.id,
          receiverId: { not: null },
        },
        {
          receiverId: session.user.id,
        },
      ],
      channelId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      sender: true,
      receiver: true,
    },
  });

  // Get unique users from direct messages
  const uniqueUsers = new Map();
  recentDirectMessages.forEach((message) => {
    const otherUserId =
      message.senderId === session.user.id
        ? message.receiverId
        : message.senderId;
    const otherUser = message.senderId === session.user.id ? message.receiver : message.sender;

    if (otherUserId && otherUser && !uniqueUsers.has(otherUserId)) {
      uniqueUsers.set(otherUserId, {
        id: otherUser.id,
        name: otherUser.name || "Unknown User",
        email: otherUser.email,
        image: otherUser.image,
        lastMessage: message,
      });
    }
  });

  const recentContacts = Array.from(uniqueUsers.values()).slice(0, 5);
  // Calculate stats
  const completedTasksCount = recentTasks.filter((t) => t.status === "DONE").length;
  
  //  asassign to me completed tasks
const assignedTasksCount = recentTasks.filter((t) =>
    t.assignments.some((a) => a.userId === session.user.id) 
  ).length;


  const pendingTasksCount = recentTasks.filter((t) => t.status === "PENDING").length;
  const inProgressTasksCount = recentTasks.filter((t) => t.status === "IN_PROGRESS").length;

  // Fetch analytics data for charts
  // 1. Task completion trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const taskTrendData = await Promise.all(
    last7Days.map(async (date) => {
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const completed = await db.task.count({
        where: {
          status: "DONE",
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          OR: [
            { creatorId: session.user.id },
            { assignments: { some: { userId: session.user.id } } },
          ],
        },
      });

      const created = await db.task.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          OR: [
            { creatorId: session.user.id },
            { assignments: { some: { userId: session.user.id } } },
          ],
        },
      });

      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completed,
        created,
      };
    })
  );

  // 2. Task status distribution for Pie Chart
  const taskStatusData = [
    { name: "Completed", value: completedTasksCount, fill: "#10b981" },
    { name: "In Progress", value: inProgressTasksCount, fill: "#f59e0b" },
    { name: "Pending", value: pendingTasksCount, fill: "#6366f1" },
  ];

  // 3. Performance metrics for Radar Chart
  const totalTasks = recentTasks.length;
  const completionRate = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;
  const activeChannelsCount = recentChannels.length;
  const messagesCount = recentChannels.reduce((sum, ch) => sum + (ch._count?.messages || 0), 0);
  const contactsCount = recentContacts.length;

  const performanceData = [
    { metric: "Task Completion", value: Math.min(completionRate, 100) },
    { metric: "Active Channels", value: Math.min((activeChannelsCount / 10) * 100, 100) },
    { metric: "Communication", value: Math.min((messagesCount / 50) * 100, 100) },
    { metric: "Collaboration", value: Math.min((contactsCount / 10) * 100, 100) },
    { metric: "Productivity", value: Math.min(((completedTasksCount + inProgressTasksCount) / (totalTasks || 1)) * 100, 100) },
  ];

  const greetingMessage = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
  <div className="max-w-8xl mx-auto space-y-8">
    {/* Subscription / Trial Banner */}
    <SubscriptionBanner />
    
    {isClient ? (
      <>
        {/* Client Dashboard - Modern Redesign */}
        <div className="flex flex-col gap-8">
          {/* Welcome Header - Enhanced */}
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Sun className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                      {greetingMessage()}, {session.user.name}!
                    </h1>
                  </div>
                  <p className="text-blue-100 text-lg md:text-xl">
                    Here's what's happening with your projects today
                  </p>
                </div>
                
                <div className="flex items-center gap-8 mt-6 lg:mt-0">
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <p className="text-blue-200 text-sm font-medium">Active Projects</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{recentTasks.length}</p>
                  </div>
                  <div className="w-px h-12 bg-blue-400/30"></div>
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-3 w-3 text-green-400" />
                      <p className="text-blue-200 text-sm font-medium">Completed</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{completedTasksCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Briefcase className="h-7 w-7 text-blue-600" />
                  My Projects
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                  Overview of your recent projects and progress
                </p>
              </div>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3">
                <Link href="/dashboard/tasks" className="flex items-center gap-2 font-semibold">
                  View All Projects 
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Projects Grid */}
            <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl overflow-hidden">
              <CardHeader className="pb-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-gray-800 dark:to-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white text-xl flex items-center gap-2">
                      Recent Projects
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">
                        {recentTasks.length} total
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Projects you're currently involved with
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {recentTasks.length > 0 ? (
                    recentTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/dashboard/tasks/${task.id}/record`}
                        className="block transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                      >
                        <TaskCard task={task} client={true} />
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-16 space-y-6">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl flex items-center justify-center shadow-lg">
                        <Briefcase className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xl font-semibold">No projects found</p>
                        <p className="text-gray-400 dark:text-gray-500 text-base mt-2">
                          Get started by creating your first project
                        </p>
                      </div>
                      <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
                        <Link href="/dashboard/tasks/new">
                          Create Project
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    ) : (
      <>
        {/* Admin/Employee Dashboard - Modern Redesign */}
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <LayoutDashboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
                Welcome back, {session.user.name}. Here's your workspace overview.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <>
                  <Button asChild className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-950 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6">
                    <Link href="/dashboard/new-channel" className="flex items-center gap-2 font-semibold">
                      <PlusCircle className="h-4 w-4" />
                      New Channel
                    </Link>
                  </Button>
                  <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6">
                    <Link href="/dashboard/tasks/new" className="flex items-center gap-2 font-semibold">
                      <PlusCircle className="h-4 w-4" />
                      New Project
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats Grid - Enhanced */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Active Channels
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {recentChannels.length}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>


  <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Assign To Me Tasks
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {assignedTasksCount}
                    </p>
                  </div>
                  
                  <div className="h-14 w-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Total Completed Tasks
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {completedTasksCount}
                    </p>
                  </div>

                  <div className="h-14 w-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>




            

            <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      In Progress
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {inProgressTasksCount}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Activity className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Recent Contacts
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {recentContacts.length}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>

          {/* Projects Section */}
          <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="pb-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-gray-800 dark:to-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white text-xl flex items-center gap-3">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                    Recent Projects
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Projects you created or are assigned to
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300">
                  <Link href="/dashboard/tasks" className="flex items-center gap-1 font-medium">
                    View All 
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ProjectPage />
            </CardContent>
          </Card>

          {/* Analytics Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCharts 
              taskTrendData={taskTrendData}
              taskStatusData={taskStatusData}
              performanceData={performanceData}
            />
          </div>

          {/* Channels & Contacts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Channels Section */}
            <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl overflow-hidden">
              <CardHeader className="pb-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-gray-800 dark:to-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white text-xl flex items-center gap-3">
                      <Hash className="h-6 w-6 text-blue-600" />
                      Recent Channels
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Your recently active channels
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300">
                    <Link href="/dashboard/channels/all" className="flex items-center gap-1 font-medium">
                      View All 
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                {recentChannels.length > 0 ? (
                  recentChannels.map((channel) => (
                    <Link
                      key={channel.id}
                      href={`/dashboard/channels/${channel.id}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 bg-white/50 dark:bg-gray-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                          <Hash className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{channel.name || "Unnamed Channel"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {channel.department && (
                              <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                {channel.department.name}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {channel._count?.messages || 0} messages
                            </span>
                          </div>
                        </div>
                      </div>
                      <Clock className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                      <Hash className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No channels yet</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                      Start by joining or creating a channel
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts Section */}
            <Card className="rounded-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl overflow-hidden">
              <CardHeader className="pb-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-purple-50/50 dark:from-gray-800 dark:to-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white text-xl flex items-center gap-3">
                      <Users className="h-6 w-6 text-purple-600" />
                      Recent Contacts
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      People you've recently messaged
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300">
                    <Link href="/dashboard/people" className="flex items-center gap-1 font-medium">
                      View All 
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                {recentContacts.length > 0 ? (
                  recentContacts.map((contact: any) => (
                    <Link
                      key={contact.id}
                      href={`/dashboard/messages/${contact.id}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 bg-white/50 dark:bg-gray-700/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-800 shadow-lg group-hover:ring-purple-100 dark:group-hover:ring-purple-900 transition-all">
                          <AvatarImage
                            src={contact.image || ""}
                            alt={contact.name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold text-sm">
                            {contact.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{contact.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                            {contact.lastMessage.content}
                          </p>
                        </div>
                      </div>
                      <Clock className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                      <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No recent contacts</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                      Start a conversation with your team members
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )}
  </div>
</div>
  );
}