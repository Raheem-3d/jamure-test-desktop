

"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, Save, Clock, User, AlertCircle, Tag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

interface CreateReminderFormProps {
  currentUser: User;
  users: User[];
}

export function CreateReminderForm({
  currentUser,
  users,
}: CreateReminderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    remindAt: new Date(),
    assigneeId: currentUser.id,
    priority: "MEDIUM",
    type: "GENERAL",
  });

  const isAdmin = currentUser.role === "ORG_ADMIN";  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the reminder",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          remindAt: formData.remindAt.toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Reminder created successfully",
        });
        router.push("/dashboard/reminders");
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create reminder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-red-600 bg-red-50 border-red-200";
      case "HIGH": return "text-orange-600 bg-orange-50 border-orange-200";
      case "MEDIUM": return "text-blue-600 bg-blue-50 border-blue-200";
      case "LOW": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 dark:bg-gray-900">
          <Link href="/dashboard/reminders">
            <Button variant="outline" size="sm" className="h-10 w-10 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Reminder</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Set up a new reminder for yourself or team members
            </p>
          </div>
        </div>

        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Reminder Details
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Fill in the reminder information and schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter reminder title..."
                  className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a detailed description..."
                  rows={4}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Assignee and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assign To
                  </Label>
                  <Select
                    value={formData.assigneeId}
                    onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAdmin ? users : users.filter((user) => user.id === currentUser.id)).map((user) => (
                        <SelectItem key={user.id} value={user.id} className="flex items-center gap-2">
                          <span>{user.name}</span>
                          {user.id === currentUser.id && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">(You)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isAdmin && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Only admins can assign reminders to others
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className={cn("h-11 border-2", getPriorityColor(formData.priority))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW" className="text-gray-600">Low Priority</SelectItem>
                      <SelectItem value="MEDIUM" className="text-blue-600">Medium Priority</SelectItem>
                      <SelectItem value="HIGH" className="text-orange-600">High Priority</SelectItem>
                      <SelectItem value="URGENT" className="text-red-600">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="TASK_DEADLINE">Task Deadline</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                      <SelectItem value="PERSONAL">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Remind At
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full h-11 justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <CalendarIcon className="mr-3 h-4 w-4 text-gray-400" />
                        {format(formData.remindAt, "MMM d, yyyy 'at' h:mm a")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.remindAt}
                        onSelect={(date) => date && setFormData({ ...formData, remindAt: date })}
                        className="rounded-md border"
                      />
                      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Time</Label>
                        {/* <Input
                          type="datetime-local"
                          value={format(formData.remindAt, "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) => setFormData({ ...formData, remindAt: new Date(e.target.value) })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        /> */}
                        <Input
  type="datetime-local"
  value={format(formData.remindAt, "yyyy-MM-dd'T'HH:mm")}
  onKeyDown={(e) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
    }
  }}
  onChange={(e) => {
    const next = new Date(e.target.value);
    if (!isNaN(next.getTime())) {
      setFormData(prev => ({ ...prev, remindAt: next }));
    }
  }}
/>

                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Creating Reminder..." : "Create Reminder"}
                </Button>
                <Link href="/dashboard/reminders" className="flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


