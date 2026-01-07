"use client";

import { useState, useEffect, useRef } from "react";
import type { Task, Comment, Stage, User, Tag } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  X,
  Calendar,
  UserIcon,
  MessageSquare,
  Paperclip,
  Send,
  Edit,
  ChevronDown,
  Users,
  CalendarIcon,
  TagIcon,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import RealTimeMessages from "./real-time-messages";
import MessageInput from "./message-input";
import { ActivityLog } from "./ActivityLog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, set } from "date-fns";
import { RangeCalendarPicker } from "./ui/RangeCalendar";

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  isComplete?: boolean;
  stages: Stage[];
  user: User;
  tags: Tag[];
  taskId: string;
}

export function TaskDetail({
  task,
  onClose,
  onUpdateTask,
  stages = [],
  isComplete = false,
  user,
  taskId,
  tags,
}: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<any>({
    ...task,
    // Initialize date range from start/end if present, else fall back to dueDate
    dueDate:
      (task as any)?.startDate || (task as any)?.endDate || (task as any)?.dueDate
        ? {
            startDate: (task as any)?.startDate
              ? new Date((task as any).startDate as any)
              : (task as any)?.dueDate
              ? new Date((task as any).dueDate as any)
              : null,
            endDate: (task as any)?.endDate
              ? new Date((task as any).endDate as any)
              : (task as any)?.dueDate
              ? new Date((task as any).dueDate as any)
              : null,
          }
        : null,
  });


  const [movingToNextTab, setMovingToNextTab] = useState(false);
  const [clientChannelId, setClientChannelId] = useState<string | null>(null);
  const [adminChannelId, setAdminChannelId] = useState<string | null>(null);
  const [clientMessages, setClientMessages] = useState<Comment[]>([]);
  const [adminMessages, setAdminMessages] = useState<Comment[]>([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const { onlineUsers } = useSocket();
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isEditingField, setIsEditingField] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  // Refs for auto-scrolling
  const clientMessagesRef = useRef<HTMLDivElement>(null);
  const adminMessagesRef = useRef<HTMLDivElement>(null);

  // console.log(user, 'userssssss');

  // Auto-scroll to bottom function
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const addActivity = (type: string, description: string, taskId?: string) => {
    const activity = {
      id: Date.now().toString(),
      type,
      description,
      user: session?.user || { name: "Unknown User", id: "unknown" },
      taskId,
      timestamp: new Date(),
    };
    setActivityLog((prev) => [activity, ...prev]);
    router.refresh();
  };


const handleSave = async (overrides?: Partial<any>) => {
  // Merge overrides with editedTask to avoid stale state issues (e.g., date picker)
  const effective: any = { ...(editedTask as any), ...(overrides || {}) };
  // Normalize assignees to array of { userId }
  const assigneesPayload: Array<{ userId: string }> = Array.isArray(
    (effective as any)?.assignees
  )
    ? (effective as any).assignees
        .map((a: any) => a?.userId || a?.id || a?.value || a)
        .filter(Boolean)
        .map((userId: string) => ({ userId }))
    : [];

  // Normalize tags to objects with id or name (server will upsert by name if id missing)
  const tagObjects: Array<{ id?: string; name?: string }> = Array.isArray(
    (effective as any)?.tags
  )
    ? (effective as any).tags
        .map((t: any) =>
          t?.id
            ? { id: t.id }
            : t?.name
            ? { name: String(t.name) }
            : null
        )
        .filter(Boolean) as Array<{ id?: string; name?: string }>
    : [];

  // Normalize dates to ISO strings; use both start and end
  const startDateIso = (effective as any)?.dueDate?.startDate
    ? new Date((effective as any).dueDate.startDate).toISOString()
    : null;
  const endDateIso = (effective as any)?.dueDate?.endDate
    ? new Date((effective as any).dueDate.endDate).toISOString()
    : null;

  const updates: any = {
    id: effective.id,
    title: effective.title,
    description: effective.description,
    priority: effective.priority,
    status: effective.status,
    stageId: effective.stageId,
    dueDate: endDateIso,
    startDate: startDateIso,
    endDate: endDateIso,
    tags: tagObjects,
    assignees: assigneesPayload,
  };

  console.log('Normalized update payload:', updates);

  try {
    const response = await fetch(`/api/tasks/${taskId}/taskrecord`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.error || "Failed to update task");
    }

    const updatedTaskData = await response.json();
    console.log('API Response:', updatedTaskData);
  const updatedTask = updatedTaskData.task;

    // Update local editing state to reflect persisted values
  setEditedTask((prev: any) => ({
      ...prev,
      ...updatedTask,
      // Rebuild local date range from server response for accuracy
      dueDate:
        (updatedTask as any)?.startDate || (updatedTask as any)?.endDate || (updatedTask as any)?.dueDate
          ? {
              startDate: (updatedTask as any)?.startDate
                ? new Date((updatedTask as any).startDate)
                : (updatedTask as any)?.dueDate
                ? new Date((updatedTask as any).dueDate)
                : null,
              endDate: (updatedTask as any)?.endDate
                ? new Date((updatedTask as any).endDate)
                : (updatedTask as any)?.dueDate
                ? new Date((updatedTask as any).dueDate)
                : null,
            }
          : null,
      // Use server tags when available, else keep what we attempted
      tags: Array.isArray((updatedTask as any)?.tags)
        ? (updatedTask as any).tags
        : tagObjects,
    } as any));

    // Notify parent so list views refresh; pass normalized updates to avoid shape mismatches
    if (onUpdateTask) {
      await onUpdateTask(task.id, updates);
    }

    addActivity(
      "task_updated",
      `Task "${updatedTask.title}" was updated`,
      taskId
    );

    setIsEditing(false);
    setIsEditingField(null);

    toast.success("Task updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    toast.error("Failed to update task");
    return false;
  }
};






  const handleMoveToNextStage = async () => {
    try {
      setMovingToNextTab(true);
      const currentStage = stages.find((s) => s.id === task.stageId);

      if (!currentStage) {
        toast.error("Current stage not found");
        return;
      }

      if (currentStage.id) {
        const success = await onUpdateTask(editedTask.id, {
          stageId: currentStage.id,
          status: "completed",
        });

        if (success) {
          toast.success("Task moved to next stage");
          setEditedTask((prev: any) => ({
            ...prev,
            stageId: currentStage.id,
          }));

          router.refresh();
          onClose();
        } else {
          toast.error("Failed to move task");
        }
      } else if (currentStage.isCompleted) {
        toast.success("Task is already completed");
      } else {
        toast.error("No next stage available");
      }
    } catch (error) {
      console.error("Error moving task:", error);
      toast.error("Failed to move task");
    } finally {
      setMovingToNextTab(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-700 border-red-200 shadow-red-100";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-yellow-100";
      case "low":
        return "bg-green-50 text-green-700 border-green-200 shadow-green-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 shadow-gray-100";
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "Bug":
        return "bg-red-50 text-red-700 border-red-200";
      case "Feature":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Urgent":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Enhancement":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const fetchClientChannel = async () => {
    try {
      setClientLoading(true);
      const res = await fetch(`/api/tasks/${task.id}/taskChannel`);
      if (!res.ok) throw new Error("Failed to fetch channels");
      const data = await res.json();

      const clientChannel = data?.recentChannelsForClient?.find(
        (channel: any) => channel.name.toLowerCase().includes("client")
      );

      if (clientChannel) {
        setClientChannelId(clientChannel.id);
        await fetchClientMessages(clientChannel.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching client channel:", error);
      toast.error("Failed to load client channel");
      return false;
    } finally {
      setClientLoading(false);
    }
  };

  const fetchAdminChannel = async () => {
    try {
      setAdminLoading(true);
      const res = await fetch(`/api/tasks/${task.id}/taskChannel`);
      if (!res.ok) throw new Error("Failed to fetch channels");
      const data = await res.json();

      const adminChannel = data?.recentChannelsForClient?.find((channel: any) =>
        channel.name.toLowerCase().includes("admin")
      );

      if (adminChannel) {
        setAdminChannelId(adminChannel.id);
        await fetchAdminMessages(adminChannel.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching admin channel:", error);
      toast.error("Failed to load admin channel");
      return false;
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchClientMessages = async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setClientMessages(data);
      setTimeout(() => scrollToBottom(clientMessagesRef), 100);
    } catch (error) {
      console.error("Error fetching client messages:", error);
      toast.error("Failed to load client messages");
    }
  };

  const fetchAdminMessages = async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setAdminMessages(data);
      setTimeout(() => scrollToBottom(adminMessagesRef), 100);
    } catch (error) {
      console.error("Error fetching admin messages:", error);
      toast.error("Failed to load admin messages");
    }
  };

  const handleNewClientMessage = (newMessage: Comment) => {
    setClientMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(clientMessagesRef), 100);
  };

  const handleNewAdminMessage = (newMessage: Comment) => {
    setAdminMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(adminMessagesRef), 100);
  };

  function formatDate(date: Date, formatStr: string) {
    return format(date, formatStr);
  }

  const fetchStages = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/record`);
      const data = await response.json();
      setActivityLog(data.activities || []);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  // Auto-load both channels on component mount
  useEffect(() => {
    const loadChannels = async () => {
      // Load both channels simultaneously
      const promises = [];

      if ((task as any).clientChannelId) {
        setClientChannelId((task as any).clientChannelId);
        promises.push(fetchClientMessages((task as any).clientChannelId));
      } else {
        promises.push(fetchClientChannel());
      }

      if ((task as any).adminChannelId) {
        setAdminChannelId((task as any).adminChannelId);
        promises.push(fetchAdminMessages((task as any).adminChannelId));
      } else {
        promises.push(fetchAdminChannel());
      }

      await Promise.allSettled(promises);
    };

    loadChannels();
    fetchStages();
  }, [(task as any).clientChannelId, (task as any).adminChannelId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (clientMessages.length > 0) {
      setTimeout(() => scrollToBottom(clientMessagesRef), 100);
    }
  }, [clientMessages]);

  useEffect(() => {
    if (adminMessages.length > 0) {
      setTimeout(() => scrollToBottom(adminMessagesRef), 100);
    }
  }, [adminMessages]);

  const EditableField = ({
    label,
    fieldName,
    children,
    className = "",
  }: {
    label: string;
    fieldName: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`group ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div
        className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 rounded-lg p-3 border border-transparent group-hover:shadow-sm"
        onClick={() => setIsEditingField(fieldName)}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-fit max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
              <p className="text-sm text-gray-600">
                Manage and track task progress
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleMoveToNextStage}
              disabled={movingToNextTab}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {movingToNextTab ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Moving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Mark Complete
                </div>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(95vh-80px)]">
          {/* Main Content */}

          <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
            <div className="space-y-6">
              {/** Normalize user prop to array for TS safety */}
              {(() => {
                return null;
              })()}
              {/** Helper list for user operations */}
              {/** Using immediate constant below in scope */}
              {/* eslint-disable-next-line */}
              {false && <div />}
              {/* Title */}
              <EditableField label="Title" fieldName="title">
                {isEditingField === "title" ? (
                  <Input
                    autoFocus
                    value={editedTask.title}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, title: e.target.value })
                    }
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave();
                      }
                    }}
                    className="text-2xl font-bold border-2 border-blue-300 focus:border-blue-500"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900 min-h-[2rem] flex items-center">
                    {editedTask.title}
                  </h1>
                )}
              </EditableField>

              {/* Description */}
              <EditableField label="Description" fieldName="description">
                {isEditingField === "description" ? (
                  <Textarea
                    autoFocus
                    value={editedTask.description}
                    onChange={(e) =>
                      setEditedTask({
                        ...editedTask,
                        description: e.target.value,
                      })
                    }
                    onBlur={handleSave}
                    rows={4}
                    className="border-2 border-blue-300 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-700 min-h-[1.5rem] leading-relaxed">
                    {editedTask.description || (
                      <span className="text-gray-400 italic">
                        Click to add description...
                      </span>
                    )}
                  </p>
                )}
              </EditableField>

              {/* Task Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
            
                {/* Due Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {" "}
                    Due Date{" "}
                  </label>
                  <div
                    className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 rounded-lg p-3 border border-transparent hover:border-blue-200 transition-all duration-200"
                    onClick={() => setIsEditingField("dueDate")}
                  >
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {isEditingField === "dueDate" ? (
                      <RangeCalendarPicker
                        value={(editedTask.dueDate || {}) as {
                          startDate?: Date | string;
                          endDate?: Date | string;
                        }}
                        onChange={(value) => {
                          setEditedTask({ ...editedTask, dueDate: value });
                          // Save immediately after selection with override to avoid stale state
                          handleSave({ dueDate: value });
                        }}
                      />
                    ) : (
                      (() => {
                        const sd = (editedTask as any)?.dueDate?.startDate;
                        const ed = (editedTask as any)?.dueDate?.endDate;
                        const start = sd ? new Date(sd) : null;
                        const end = ed ? new Date(ed) : start;
                        if (start && end) {
                          const sameDay = start.toDateString() === end.toDateString();
                          return (
                            <span className="font-medium">
                              {sameDay
                                ? formatDate(start, "MMM dd, yyyy")
                                : `${formatDate(start, "MMM dd")} - ${formatDate(end, "MMM dd, yyyy")}`}
                            </span>
                          );
                        }
                        return (
                          <span className="text-gray-400 italic">No due date set</span>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Assignee
                  </label>
                  <div
                    className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 rounded-lg p-3 border border-transparent hover:border-blue-200 transition-all duration-200"
                    onClick={() => setIsEditingField("assignees")}
                  >
                    <UserIcon className="h-4 w-4 text-blue-600" />
                    {isEditingField === "assignees" ? (
                      <div className="w-full">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(Array.isArray(user) ? (user as User[]) : [user as User]).map((u: User) => {
                            const isAssigned = (editedTask.assignees || []).some((a: any) => a.userId === u.id);
                            return (
                              <Badge
                                key={u.id}
                                className={`cursor-pointer select-none ${isAssigned ? "ring-2 ring-blue-400" : ""}`}
                                onClick={() => {
                                  const current = Array.isArray(editedTask.assignees) ? [...editedTask.assignees] : [];
                                  let next;
                                  if (isAssigned) {
                                    next = current.filter((a: any) => a.userId !== u.id);
                                  } else {
                                    next = [...current, { userId: u.id, taskId, recordId: editedTask.id }];
                                  }
                                  setEditedTask({ ...editedTask, assignees: next });
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  {u.name}
                                </div>
                              </Badge>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave()}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setIsEditingField(null)}>Close</Button>
                        </div>
                      </div>
                    ) : (
                      (editedTask.assignees || []).length > 0
                        ? (editedTask.assignees || [])
                            .map((a: any) => {
                              const list = Array.isArray(user) ? (user as User[]) : [user as User];
                              const u = list.find((usr: User) => usr.id === a.userId);
                              return u ? u.name : "Unknown";
                            })
                            .join(", ")
                        : "No assignees"
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tags
                  </label>
                  <div
                    className="text-sm text-gray-700 rounded-lg p-3 border transition-all duration-200 hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TagIcon className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Add or remove tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tags.map((tag) => {
                        const isSelected = (editedTask.tags || []).some((t: any) => t.id === tag.id);
                        return (
                          <Badge
                            key={tag.id}
                            onClick={() => {
                              const current = Array.isArray(editedTask.tags) ? [...editedTask.tags] : [];
                              let next;
                              if (isSelected) {
                                next = current.filter((t: any) => t.id !== tag.id);
                              } else {
                                next = [...current, tag];
                              }
                              setEditedTask({ ...editedTask, tags: next });
                            }}
                            className={`${getTagColor(tag.name)} border cursor-pointer select-none ${
                              isSelected ? "ring-2 ring-blue-400" : ""
                            }`}
                          >
                            {tag.name}
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Create new tag"
                        value={(editedTask as any)?.__newTagName || ""}
                        onChange={(e) =>
                          setEditedTask({ ...editedTask, __newTagName: e.target.value })
                        }
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const name = String((editedTask as any)?.__newTagName || "").trim();
                          if (!name) return;
                          // Add a temp tag with just a name; server will create it
                          const current = Array.isArray(editedTask.tags) ? [...editedTask.tags] : [];
                          const exists = current.some((t: any) => (t.name || "").toLowerCase() === name.toLowerCase());
                          if (!exists) {
                            const tempTag = { id: undefined as any, name } as any;
                            const next = [...current, tempTag];
                            setEditedTask({ ...editedTask, tags: next, __newTagName: "" });
                          }
                        }}
                      >
                        Add
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSave()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>


              </div>

              {/* Attachments */}
              {editedTask?.attachments?.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({editedTask.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {editedTask.attachments.map((attachment: any) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium">
                          {attachment.name}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Chat Panel */}
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Internal discussion
                  </h3>
                  <p className="text-xs text-gray-600">Internal discussion</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {adminLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">
                      Loading admin chat...
                    </p>
                  </div>
                </div>
              ) : adminChannelId ? (
                <>
                  <div
                    ref={adminMessagesRef}
                    className="flex-1 overflow-y-auto p-4 scroll-smooth"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    <RealTimeMessages
                      initialMessages={adminMessages as any}
                      channelId={adminChannelId}
                    />
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <MessageInput
                      channelId={adminChannelId}
                      onMessageSent={() => {
                        if (adminChannelId) fetchAdminMessages(adminChannelId);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-3">
                      No admin channel available
                    </p>
                    <Button
                      variant="outline"
                      onClick={fetchAdminChannel}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      Try to Load Channel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Chat Panel */}
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Discuss about the project
                  </h3>
                  {/* <p className="text-xs text-gray-600">Communicate with client</p> */}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {clientLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">
                      Loading client chat...
                    </p>
                  </div>
                </div>
              ) : clientChannelId ? (
                <>
                  <div
                    ref={clientMessagesRef}
                    className="flex-1 overflow-y-auto p-4 scroll-smooth"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    <RealTimeMessages
                      initialMessages={clientMessages as any}
                      channelId={clientChannelId}
                    />
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <MessageInput
                      channelId={clientChannelId}
                      onMessageSent={() => {
                        if (clientChannelId) fetchClientMessages(clientChannelId);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-3">
                      No client channel available
                    </p>
                    <Button
                      variant="outline"
                      onClick={fetchClientChannel}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      Try to Load Channel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log Panel */}
          <div className="w-80 border-l border-gray-200  overflow-y-auto">
            <div className="sticky top-0  p-4 border-b border-gray-200 dark:bg-gray-900  z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Activity Log</h3>
                  <p className="text-xs text-gray-600">Recent task updates</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <ActivityLog activities={activityLog} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced utility components for better organization and reusability

// Priority Badge Component with enhanced styling
const PriorityBadge = ({
  priority,
  onClick,
  isEditing = false,
}: {
  priority: string;
  onClick: () => void;
  isEditing?: boolean;
}) => {
  const priorityConfig = {
    urgent: {
      emoji: "🔴",
      color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      label: "Urgent",
      pulse: "animate-pulse",
    },
    high: {
      emoji: "🟠",
      color:
        "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      label: "High",
      pulse: "",
    },
    medium: {
      emoji: "🟡",
      color:
        "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
      label: "Medium",
      pulse: "",
    },
    low: {
      emoji: "🟢",
      color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
      label: "Low",
      pulse: "",
    },
  };

  const config = priorityConfig[priority as keyof typeof priorityConfig] || {
    emoji: "⚪",
    color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    label: priority,
    pulse: "",
  };

  return (
    <Badge
      className={`${config.color} ${config.pulse} cursor-pointer border hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm px-4 py-2 font-medium`}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        {config.emoji}
        {config.label}
      </span>
    </Badge>
  );
};

// Enhanced Tag Component
const TagBadge = ({ tag, onClick }: { tag: Tag; onClick: () => void }) => {
  const tagConfig = {
    Bug: {
      color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      emoji: "🐛",
    },
    Feature: {
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      emoji: "✨",
    },
    Urgent: {
      color:
        "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      emoji: "⚡",
    },
    Enhancement: {
      color:
        "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      emoji: "🚀",
    },
  };

  const config = tagConfig[tag.name as keyof typeof tagConfig] || {
    color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    emoji: "🏷️",
  };

  return (
    <Badge
      className={`${config.color} border hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer`}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        {config.emoji}
        {tag.name}
      </span>
    </Badge>
  );
};

// Status Indicator Component
const StatusIndicator = ({ status }: { status: string }) => {
  const statusConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
      label: "Pending",
    },
    "in-progress": {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <ArrowRight className="h-3 w-3" />,
      label: "In Progress",
    },
    completed: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Completed",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <Clock className="h-3 w-3" />,
    label: status,
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.color} shadow-sm`}
    >
      {config.icon}
      {config.label}
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = ({
  size = "md",
  color = "blue",
}: {
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "purple" | "red";
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const colorClasses = {
    blue: "border-blue-200 border-t-blue-600",
    green: "border-green-200 border-t-green-600",
    purple: "border-purple-200 border-t-purple-600",
    red: "border-red-200 border-t-red-600",
  };

  return (
    <div
      className={`${sizeClasses[size]} border-4 ${colorClasses[color]} rounded-full animate-spin`}
    />
  );
};

// Empty State Component
const EmptyState = ({
  icon,
  title,
  description,
  actionButton,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center p-8 max-w-sm">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4 text-sm leading-relaxed">
        {description}
      </p>
      {actionButton}
    </div>
  </div>
);

// Date Formatter Helper
const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = format(startDate, "MMM dd");
  const end = format(endDate, "MMM dd, yyyy");

  if (start === end) {
    return format(startDate, "MMM dd, yyyy");
  }

  return `${start} - ${end}`;
};

// Enhanced Input Component with better focus states
const EnhancedInput = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className = "",
  autoFocus = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) => (
  <Input
    autoFocus={autoFocus}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    className={`border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${className}`}
  />
);

// Enhanced Textarea Component
const EnhancedTextarea = ({
  value,
  onChange,
  onBlur,
  rows = 4,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) => (
  <Textarea
    autoFocus={autoFocus}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    rows={rows}
    placeholder={placeholder}
    className="border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
  />
);

// Animation keyframes for CSS (can be added to global styles)
const animationStyles = `
@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slideInFromRight 0.3s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-out;
}
`;

// Hook for auto-scroll functionality
const useAutoScroll = (
  messages: Comment[],
  containerRef: React.RefObject<HTMLDivElement>
) => {
  useEffect(() => {
    if (messages.length > 0 && containerRef.current) {
      const container = containerRef.current;
      const isScrolledToBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 1;

      if (isScrolledToBottom || messages.length === 1) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, [messages, containerRef]);
};

// Chat notification system
const useChatNotifications = () => {
  const [unreadCounts, setUnreadCounts] = useState({
    client: 0,
    admin: 0,
  });

  const incrementUnread = (channel: "client" | "admin") => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channel]: prev[channel] + 1,
    }));
  };

  const clearUnread = (channel: "client" | "admin") => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channel]: 0,
    }));
  };

  return { unreadCounts, incrementUnread, clearUnread };
};

// Performance optimized message renderer
const OptimizedMessageList = ({
  messages,
  channelId,
}: {
  messages: Comment[];
  channelId: string;
}) => {
  const [visibleMessages, setVisibleMessages] = useState(messages.slice(-50)); // Show last 50 messages

  useEffect(() => {
    setVisibleMessages(messages.slice(-50));
  }, [messages]);

  return (
    <div className="space-y-3">
      {visibleMessages.map((message, index) => (
        <div key={message.id} className="animate-fade-in-up">
          <RealTimeMessages initialMessages={[message] as any} channelId={channelId} />
        </div>
      ))}
    </div>
  );
};

export default TaskDetail;
