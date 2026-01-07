"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskCard from "@/components/task-card";
import TaskFilter from "@/components/task-filter";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/lib/rbac-utils";

export default function TasksPage() {
  const { data: session } = useSession();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [createdTasks, setCreatedTasks] = useState<any[]>([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState<any[]>([]);
  const [filteredCreatedTasks, setFilteredCreatedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<any>({});

  const { toast } = useToast();
  const perms = usePermissions();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!session?.user?.id) return;

      try {
        setIsLoading(true);

        // Fetch assigned tasks
        const assignedResponse = await fetch(
          `/api/tasks?assignedTo=${session.user.id}`
        );

        // Fetch created tasks
        const createdResponse = await fetch(
          `/api/tasks?createdBy=${session.user.id}`
        );
        //  console.log(session?.user?.role,'user check')

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

    // Listen for task assignment events to refresh when user is assigned to a task
    const onTaskAssigned = () => {
      console.log("🔔 Task assigned - refreshing task list");
      fetchTasks();
    };

    window.addEventListener("task:assigned", onTaskAssigned as EventListener);

    return () => {
      window.removeEventListener("task:assigned", onTaskAssigned as EventListener);
    };
  }, [session, toast]);

  useEffect(() => {
    // Apply filters to tasks
    if (Object.keys(activeFilters).length === 0) {
      // No filters, show all tasks
      setFilteredAssignedTasks(assignedTasks);
      setFilteredCreatedTasks(createdTasks);
      return;
    }

    const filterTasks = (tasks: any[]) => {
      return tasks.filter((task) => {
        // Filter by status
        if (activeFilters.status && task.status !== activeFilters.status) {
          return false;
        }

        // Filter by priority
        if (
          activeFilters.priority &&
          task.priority !== activeFilters.priority
        ) {
          return false;
        }

        return true;
      });
    };

    setFilteredAssignedTasks(filterTasks(assignedTasks));
    setFilteredCreatedTasks(filterTasks(createdTasks));
  }, [activeFilters, assignedTasks, createdTasks]);

  // Group tasks by status
  const groupTasksByStatus = (tasks: any[]) => {
    const grouped: Record<string, any[]> = {
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
  const groupedCreatedTasks = groupTasksByStatus(filteredCreatedTasks);

  const handleFilterChange = (filters: any) => {
    setActiveFilters(filters);
  };

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
        <div className="flex items-center space-x-2">
          <TaskFilter onFilterChange={handleFilterChange} />
          {perms.canCreateTasks && (
            <Button asChild>
              <Link href="/dashboard/tasks/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="assigned" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
            {perms.canCreateTasks && (
              <TabsTrigger value="created">Created by Me</TabsTrigger>
            )}

            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned">
            <Card>
              <CardHeader>
                <CardTitle>Projects Assigned to Me</CardTitle>
                <CardDescription>
                  Projects that have been assigned to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAssignedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      No tasks assigned to you
                    </p>

                    {perms.canCreateTasks && (
                      <>
                        <Button variant="outline" asChild>
                          <Link href="/dashboard/tasks/new">
                            Create a New Project
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAssignedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="created">
            <Card>
              <CardHeader>
                <CardTitle>Projects Created by Me</CardTitle>
                <CardDescription>Projects that you have created</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredCreatedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    {perms.canCreateTasks && (
                      <>
                        <p className="text-gray-500 mb-4">
                          No projects created by you
                        </p>
                        <Button variant="outline" asChild>
                          <Link href="/dashboard/tasks/new">
                            Create a New Projects
                          </Link>
                        </Button>
                      </>
                    )}

                    {/* <Button variant="outline" asChild>
                      <Link href="/dashboard/tasks/new">Create a New Task</Link>
                    </Button> */}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCreatedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanban">
            <Card>
              <CardHeader>
                <CardTitle>Kanban Board</CardTitle>
                <CardDescription>
                  Visualize your projects by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Todo Column */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-gray-400 mr-2"></span>
                      To Do ({groupedAssignedTasks.TODO.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.TODO.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-blue-400 mr-2"></span>
                      In Progress ({groupedAssignedTasks.IN_PROGRESS.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.IN_PROGRESS.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Blocked Column */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-medium text-red-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-red-400 mr-2"></span>
                      Blocked ({groupedAssignedTasks.BLOCKED.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.BLOCKED.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Done Column */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                      Done ({groupedAssignedTasks.DONE.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.DONE.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
