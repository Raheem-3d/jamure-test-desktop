"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock } from "lucide-react";
import { isSameDay, format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
};

export function TaskCalendarWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksForDate, setTasksForDate] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);

  // Fetch tasks with deadlines
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/tasks?withDeadlines=true");
        if (response.ok) {
          const data = await response.json();
          setTasks(data);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
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
  }, []);

  // Update tasks for selected date
  useEffect(() => {
    if (!date) return;

    const filtered = tasks.filter(
      (task) => task.deadline && isSameDay(new Date(task.deadline), date)
    );
    setTasksForDate(filtered);
  }, [date, tasks]);

  // Function to check if a date has tasks
  const hasTasksOnDate = (day: Date) => {
    return tasks.some(
      (task) => task.deadline && isSameDay(new Date(task.deadline), day)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-blue-100 text-blue-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "URGENT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-gray-100 text-gray-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "BLOCKED":
        return "bg-red-100 text-red-800";
      case "DONE":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Count upcoming tasks
  const upcomingTasksCount = tasks.filter(
    (task) => task.deadline && new Date(task.deadline) >= new Date()
  ).length;

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative  ">
          <CalendarIcon className="h-4 w-4 dark:bg-gray-900" />
          <span className="dark:bg-gray-900">Tasks Calendar</span>
          {upcomingTasksCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white rounded-full text-xs">
              {upcomingTasksCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 dark:bg-gray-900 " align="end">
        <Card className="border-0 shadow-none  dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Task Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className={"rounded-md border dark:bg-gray-900"}
              modifiers={{
                hasTask: (day) => hasTasksOnDate(day),
              }}
              modifiersClassNames={{
                hasTask: "bg-red-500 text-white", // Customize background & text color here
              }}
            />

            {date && tasksForDate.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tasks for {format(date, "MMM d, yyyy")}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasksForDate.map((task) => (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks/${task.id}`}
                      className="block"
                      onClick={() => setShowPopover(false)}
                    >
                      <div className="p-2 border rounded-md hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          <div className="flex gap-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusColor(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Due: {format(new Date(task.deadline), "h:mm a")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {date && tasksForDate.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  No tasks due on this date
                </p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Loading tasks...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
