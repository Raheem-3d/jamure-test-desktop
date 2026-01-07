
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClientAccessLevel, getAccessLevelInfo } from "@/lib/client-access";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, getPriorityColor, getStatusColor } from "@/lib/utils";
import TaskStatusUpdate from "@/components/task-status-update";
import TaskComments from "@/components/task-comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarClock, MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { differenceInDays } from "date-fns";

export default async function TaskDetailPage({
  params,
}: {
  params: { taskId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const task = await db.task.findUnique({
    where: {
      id: params.taskId,
    },
    include: {
      creator: true,
      assignments: {
        include: {
          user: true,
        },
      },
      comments: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      channel: true,
    },
  });

  if (!task) {
    notFound();
  }

  const userId = (session.user as any)?.id;

  // Check if user is authorized to view this task
  const isCreator = task.creatorId === userId;
  const isAssignee = task.assignments.some(
    (assignment: any) => assignment.userId === userId
  );

  // Check client access level
  const clientAccessLevel = await getClientAccessLevel(userId, params.taskId);
  const hasAccess = isCreator || isAssignee || clientAccessLevel !== null;

  if (!hasAccess) {
    redirect("/dashboard/tasks");
  }

  // Determine user permissions
  const canEdit = isCreator || isAssignee || clientAccessLevel === "EDIT";
  const canComment = isCreator || isAssignee || clientAccessLevel === "COMMENT" || clientAccessLevel === "EDIT";
  const accessInfo = clientAccessLevel ? getAccessLevelInfo(clientAccessLevel) : null;

  // Calculate days until deadline
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

  // Get priority icon
  const getPriorityIcon = () => {
    switch (task.priority) {
      case "LOW":
        return <Clock className="h-4 w-4" />;
      case "MEDIUM":
        return <Clock className="h-4 w-4" />;
      case "HIGH":
        return <AlertTriangle className="h-4 w-4" />;
      case "URGENT":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
     
     <div className="flex items-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Link>
        </Button>
     </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight flex-1">{task.title}</h2>
          <div className="flex items-center mt-2 space-x-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status === "DONE" && (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              {task.status}
            </Badge>
            <Badge className={getPriorityColor(task.priority)}>
              {getPriorityIcon()}
              <span className="ml-1">{task.priority}</span>
            </Badge>
            {task.deadline && (
              <Badge
                variant="outline"
                className={`flex items-center ${
                  isOverdue
                    ? "bg-red-100 text-red-800 border-red-200"
                    : isUrgent
                    ? "bg-orange-100 text-orange-800 border-orange-200"
                    : "bg-gray-100"
                }`}
              >
                <CalendarClock className="h-3 w-3 mr-1" />
                {isOverdue ? "Overdue: " : "Due: "}
                {formatDate(task.deadline)}
              </Badge>
            )}
            {accessInfo && (
              <Badge className={accessInfo.color}>
                {accessInfo.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {task.channel && canComment && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/channels/${task.channel.id}`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Task Thread
                </Link>
              </Button>
            </>
          )}
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/tasks/${task.id}/edit`}>Edit Task</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
              <CardDescription className="flex items-center">
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarImage
                    src={task.creator.image || ""}
                    alt={task.creator.name}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-800">
                    {task.creator.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                Created by {task.creator.name} on {formatDate(task.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Description
                </h3>
                <p className="mt-1 whitespace-pre-wrap">
                  {task.description || "No description provided"}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="text-sm">{formatDate(task.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Last Updated
                  </h3>
                  <p className="text-sm">{formatDate(task.updatedAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Deadline
                  </h3>
                  <p className="text-sm">
                    {((task as any).deadlineStart && (task as any).deadlineEnd)
                      ? (((task as any).deadlineStart !== (task as any).deadlineEnd)
                          ? `${formatDate((task as any).deadlineStart)} — ${formatDate((task as any).deadlineEnd)}`
                          : formatDate((task as any).deadlineEnd))
                      : (task.deadline ? formatDate(task.deadline) : "No deadline")}
                  </p>
                </div>
              </div>
            </CardContent>
            {(isAssignee || canEdit) && (
              <CardFooter>
                <TaskStatusUpdate taskId={params.taskId} currentStatus={task.status} />
              </CardFooter>
            )}
          </Card>

          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              {accessInfo && (
                <TabsTrigger value="permissions">Your Access</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="comments">
              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                  {!canComment && (
                    <CardDescription className="text-amber-600">
                      ⓘ You have view-only access. You cannot add comments.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <TaskComments 
                    taskId={task.id} 
                    comments={task.comments}
                  />
                  {!canComment && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        ⓘ You have view-only access. You cannot add comments.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Task History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-3">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Task created</p>
                        <p className="text-sm text-gray-500">
                          {task.creator.name} created this task on{" "}
                          {formatDate(task.createdAt)}
                        </p>
                      </div>
                    </div>
                    {task.assignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-start">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-800 mr-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={assignment.user.image || ""}
                              alt={assignment.user.name}
                            />
                            <AvatarFallback className="bg-green-100 text-green-800">
                              {assignment.user.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="font-medium">User assigned</p>
                          <p className="text-sm text-gray-500">
                            {assignment.user.name} was assigned to this task on{" "}
                            {formatDate(assignment.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {accessInfo && (
              <TabsContent value="permissions">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Access Level</CardTitle>
                    <CardDescription>{accessInfo.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${accessInfo.color}`}>
                        <h3 className="font-semibold text-lg">{accessInfo.label}</h3>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">What you can do:</h4>
                        <ul className="space-y-2">
                          {accessInfo.permissions.map((permission, index) => (
                            <li key={index} className="flex items-center text-sm">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              {permission}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {clientAccessLevel === "VIEW" && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-800">
                            <strong>Note:</strong> You have view-only access. Contact the task creator to request additional permissions.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignees</CardTitle>
            </CardHeader>
            <CardContent>
              {task.assignments.length === 0 ? (
                <p className="text-sm text-gray-500">No assignees</p>
              ) : (
                <div className="space-y-4">
                  {task.assignments.map((assignment: any) => (
                    <div
                      key={assignment.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={assignment.user.image || ""}
                          alt={assignment.user.name}
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-800">
                          {assignment.user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{assignment.user.name}</p>
                        <p className="text-sm text-gray-500">
                          {assignment.user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {canEdit && (
              <CardFooter>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/dashboard/tasks/${task.id}/assignees`}>
                    Manage Assignees
                  </Link>
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={`/dashboard/tasks/${task.id}/edit`}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Edit Task Details
                  </Link>
                </Button>
              )}
              {task.channel && canComment && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={`/dashboard/channels/${task.channel.id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Discussion Thread
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start">
                <CalendarClock className="h-4 w-4 mr-2" />
                <Link href={`/dashboard/task-reminder`}>
                      Set Reminder
                  </Link>
              
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
