


"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useToast } from "./ui/use-toast";
import { PlusCircle, Loader2, Filter, CheckCircle2, Clock, AlertCircle, Play, BarChart3, Grid3X3, List, Calendar, Users, Search } from "lucide-react";
import TaskCard from "@/components/task-card";
import { Button } from "./ui/button";
import { usePermissions } from "@/lib/rbac-utils";
import Link from "next/link";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const TaskFilter = ({ onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const handleFilterUpdate = (key, value) => {
    const newFilters = { ...filters };
    if (value === "all" || !value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      >
        <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filters</span>
        {Object.keys(filters).length > 0 && (
          <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {Object.keys(filters).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 p-4 min-w-64">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">Status</label>
              <select
                onChange={(e) => handleFilterUpdate("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">Priority</label>
              <select
                onChange={(e) => handleFilterUpdate("priority", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TasksPage() {
  const { data: session } = useSession();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState([]);
  const [filteredCreatedTasks, setFilteredCreatedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});
  const [activeTab, setActiveTab] = useState("assigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const { toast } = useToast();
  const perms = usePermissions();
  // Check if user can create tasks (either TASK_CREATE or PROJECT_MANAGE)
  const canCreateProjects = perms.canCreateTasks
  const isAdmin = session?.user?.role === "ORG_ADMIN"

  useEffect(() => {
    const fetchTasks = async () => {
      if (!session?.user?.id) return;

      try {
        const [assignedResponse, createdResponse] = await Promise.all([
          fetch(`/api/tasks?assignedTo=${session.user.id}`),
          fetch(`/api/tasks?createdBy=${session.user.id}`)
        ]);

        if (assignedResponse.ok && createdResponse.ok) {
          const assignedData = await assignedResponse.json();
          const createdData = await createdResponse.json();

          setAssignedTasks(assignedData);
          setFilteredAssignedTasks(assignedData);
          setCreatedTasks(createdData);
          setFilteredCreatedTasks(createdData);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();

    // Listen for real-time task assignments
    const handleTaskAssigned = () => {
      fetchTasks();
    };

    window.addEventListener("task:assigned", handleTaskAssigned);
    return () => {
      window.removeEventListener("task:assigned", handleTaskAssigned);
    };
  }, [session, toast]);

  useEffect(() => {
    const filterTasks = (tasks) => {
      return tasks.filter((task) => {
        // Search filter
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // Status filter
        if (activeFilters.status && task.status !== activeFilters.status) {
          return false;
        }

        // Priority filter
        if (activeFilters.priority && task.priority !== activeFilters.priority) {
          return false;
        }

        return true;
      });
    };

    setFilteredAssignedTasks(filterTasks(assignedTasks));
    setFilteredCreatedTasks(filterTasks(createdTasks));
  }, [activeFilters, assignedTasks, createdTasks, searchQuery]);

  // Group tasks by status for kanban view
  const groupTasksByStatus = (tasks) => {
    const grouped = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped["TODO"].push(task);
      }
    });

    return grouped;
  };

  const groupedAssignedTasks = groupTasksByStatus(filteredAssignedTasks);

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  // Stats calculation
  const totalTasks = filteredAssignedTasks.length;
  const completedTasks = filteredAssignedTasks.filter(t => t.status === "DONE").length;
  const inProgressTasks = filteredAssignedTasks.filter(t => t.status === "IN_PROGRESS").length;
  const todoTasks = filteredAssignedTasks.filter(t => t.status === "TODO").length;

  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={cn("text-3xl font-bold", color)}>{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <div className={cn("p-3 rounded-xl", color.replace('text', 'bg').replace('-600', '-100 dark:bg-gray-700'))}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  const ViewToggle = () => (
    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => setViewMode("grid")}
        className={cn(
          "p-2 rounded-md transition-colors",
          viewMode === "grid" 
            ? "bg-white dark:bg-gray-700 shadow-sm" 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        )}
      >
        <Grid3X3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={cn(
          "p-2 rounded-md transition-colors",
          viewMode === "list" 
            ? "bg-white dark:bg-gray-700 shadow-sm" 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
  //         <p className="text-gray-600 dark:text-gray-400">Loading your projects...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1F2937]">
      <div className="max-w-8xl mx-auto p-6 dark:bg-[#1F2937]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and track all your projects in one place
              </p>
            </div>
            {canCreateProjects && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Link href="/dashboard/tasks/new" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Project
                </Link>
              </Button>
            )}
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Projects"
              value={totalTasks}
              icon={BarChart3}
              color="text-blue-600 dark:text-blue-400"
              description="All assigned projects"
            />
            <StatCard
              title="To Do"
              value={todoTasks}
              icon={Clock}
              color="text-gray-600 dark:text-gray-400"
              description="Waiting to start"
            />
            <StatCard
              title="In Progress"
              value={inProgressTasks}
              icon={Play}
              color="text-orange-600 dark:text-orange-400"
              description="Active work"
            />
            <StatCard
              title="Completed"
              value={completedTasks}
              icon={CheckCircle2}
              color="text-green-600 dark:text-green-400"
              description="Finished projects"
            />
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab("assigned")}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                  activeTab === "assigned"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                Assigned to Me
              </button>
              {canCreateProjects && (
                <button
                  onClick={() => setActiveTab("created")}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                    activeTab === "created"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Created by Me
                </button>
              )}
              <button
                onClick={() => setActiveTab("kanban")}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                  activeTab === "kanban"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                Kanban View
              </button>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="flex gap-2">
                <TaskFilter onFilterChange={handleFilterChange} />
                <ViewToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "assigned" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projects Assigned to Me</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {filteredAssignedTasks.length} project{filteredAssignedTasks.length !== 1 ? 's' : ''} assigned to you
              </p>
            </div>
            <div className="p-6">
              {filteredAssignedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No projects assigned to you</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
                    {searchQuery || Object.keys(activeFilters).length > 0 
                      ? "Try adjusting your search or filters" 
                      : "You'll see projects here once they're assigned to you"
                    }
                  </p>
                  {canCreateProjects && (
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Link href="/dashboard/tasks/new">
                        Create New Project
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "gap-6",
                  viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"
                )}>
                  {filteredAssignedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      admin={isAdmin} 
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "created" && canCreateProjects && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projects Created by Me</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {filteredCreatedTasks.length} project{filteredCreatedTasks.length !== 1 ? 's' : ''} created by you
              </p>
            </div>
            <div className="p-6">
              {filteredCreatedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <PlusCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">No projects created by you</p>
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/dashboard/tasks/new">
                      Create New Project
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className={cn(
                  "gap-6",
                  viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"
                )}>
                  {filteredCreatedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "kanban" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Kanban Board</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Visualize your project progress
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {[
                  { status: "TODO", title: "To Do", color: "bg-gray-400", count: groupedAssignedTasks.TODO.length },
                  { status: "IN_PROGRESS", title: "In Progress", color: "bg-blue-400", count: groupedAssignedTasks.IN_PROGRESS.length },
                  { status: "BLOCKED", title: "Blocked", color: "bg-red-400", count: groupedAssignedTasks.BLOCKED.length },
                  { status: "DONE", title: "Done", color: "bg-green-400", count: groupedAssignedTasks.DONE.length },
                ].map((column) => (
                  <div key={column.status} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${column.color}`}></div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{column.title}</h3>
                      </div>
                      <Badge variant="secondary" className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                        {column.count}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {groupedAssignedTasks[column.status].map((task) => (
                        <TaskCard key={task.id} task={task} showActions={false} compact={true} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}