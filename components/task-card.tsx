

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Clock,
  Play,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { differenceInDays } from "date-fns";
// Priority dot colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "HIGH":
      return "bg-red-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "LOW":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

// Status badge colors - light mode
const getStatusColorLight = (status: string) => {
  switch (status) {
    case "TODO":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "BLOCKED":
      return "bg-red-100 text-red-700 border-red-200";
    case "DONE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

// Status badge colors - dark mode
const getStatusColorDark = (status: string) => {
  switch (status) {
    case "TODO":
      return "bg-slate-700 text-slate-200 border-slate-600 dark:text-white";
    case "IN_PROGRESS":
      return "bg-blue-800 text-blue-200 border-blue-700";
    case "BLOCKED":
      return "bg-red-800 text-red-200 border-red-700";
    case "DONE":
      return "bg-emerald-800 text-emerald-200 border-emerald-700";
    default:
      return "bg-gray-800 text-gray-200 border-gray-700";
  }
};

// Status icons
const getStatusIcon = (status: string) => {
  switch (status) {
    case "TODO":
      return <Clock className="h-4 w-4" />;
    case "IN_PROGRESS":
      return <Play className="h-4 w-4" />;
    case "BLOCKED":
      return <AlertCircle className="h-4 w-4" />;
    case "DONE":
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};


//   // Calculate days until deadline


export default function TaskCard({
  task,
  showActions = true,
  client,
  admin,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);



    const daysUntilDeadline = task.deadline
    ? differenceInDays(new Date(task.deadline), new Date())
    : null;

  // Determine urgency
  const isUrgent =
    daysUntilDeadline !== null &&
    daysUntilDeadline <= 1 &&
    task.status !== "DONE";
  const isOverdue =
    daysUntilDeadline !== null &&
    daysUntilDeadline < 0 &&
         task.status !== "DONE";

type TaskCardProps = {
  task: any;
  showActions?: boolean;
  client?: boolean;
  admin?: boolean;
};





   console.log(task,'taskcardtask')
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full"
    >
      <Card
        className={`rounded-xl transition-all duration-300 ${
          isHovered 
            ? "shadow-lg border-gray-200 dark:border-gray-700 -translate-y-1" 
            : "shadow-sm border-gray-100 dark:border-gray-800"
        } bg-white dark:bg-[#15171c]`}
      >
        <CardContent className="p-6">
          {/* Top row: Priority + Status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${getPriorityColor(
                  task.priority
                )}`}
              ></div>
              <span className="text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wide">
                {task.priority} Priority
              </span>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColorLight(
                task.status
              )} dark:${getStatusColorDark(task.status)} flex items-center space-x-1`}
            >
              {getStatusIcon(task.status)}
              <span>{task.status.replace("_", " ")}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {task.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-white text-sm mb-4 line-clamp-2">
            {task.description || "No description"}
          </p>

          {/* Creator + Deadline */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-gray-500 dark:text-white mb-4">
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={task.creator?.image || ""} />
                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
                  {task.creator?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">Created by: {task.creator?.name}</span>
            </div>


           

          </div>

          <div>
              {task.deadline && (
              <div
                className={`flex items-center  ${isOverdue
                    ? "  text-red-600 font-medium"
                    : isUrgent
                      ? "text-orange-600 font-medium"
                      : "text-gray-500"
                  }`}
              >
                <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {isOverdue ? "Overdue: " : "Due: "}
                  {formatDate(task.deadline)}
                </span>
              </div>
            )}
          </div>

          {/* Assignments */}
          {task.assignments && task.assignments.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-white mb-2">Assigned to:</p>
              <div className="flex -space-x-2 overflow-hidden">
                {task.assignments.map((assignment: any) => (
                  <Avatar
                    key={assignment.id}
                    className="h-6 w-6 border-2 border-white dark:border-gray-800"
                  >
                    <AvatarImage
                      src={assignment.user?.image || ""}
                      alt={assignment.user?.name || ""}
                    />
                    <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                      {assignment.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Actions */}
        {!client && showActions && (
          <CardFooter className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              asChild
            >
              <Link href={`/dashboard/tasks/${task.id}`}>View Details</Link>
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {task.channel && (
                <>
                  {admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      asChild
                    >
                      <Link href={`/dashboard/tasks/${task.id}/record`}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Records
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    asChild
                  >
                    <Link href={`/dashboard/channels/${task.channel.id}`}>
                      Discussion
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}