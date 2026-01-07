"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Hash, MessageSquare, Bell, BellOff, UserPlus } from "lucide-react";
import { UserMultiSelect } from "@/components/user-multi-select";
import { toast } from "sonner";
import { Session } from "inspector/promises";

type ChannelInfoProps = {
  channel: any;
};

export function ChannelInfoDisplay({ channel }: ChannelInfoProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const router = useRouter();
  // const { toast } = useToast()
  console.log(channel, "channel");
  const [members, setMembers] = useState();

  const handleLeaveChannel = async (id: string) => {
    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "DELETE",
        body: JSON.stringify({ userId: id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      // ✅ Update local state to remove deleted member
      setMembers((prevMembers) => channel.members.filter((m) => m.id !== id));

      toast("Member Deleted", {
        description: "The member has been removed successfully.",
      });
      router.refresh();
    } catch (error) {
      console.error("Server Error:", error);
      toast("Error", {
        description: "Something went wrong while deleting the member.",
      });
    }
  };

  const handleDeleteChannel = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete channel");
      }

      toast("Channel deleted", {
        description: "The channel has been deleted successfully",
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast("Error", {
        description: "Failed to delete channel",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast(isMuted ? "Notifications enabled" : "Notifications muted", {
      description: isMuted
        ? "You will now receive notifications for this channel"
        : "You will no longer receive notifications for this channel",
    });
  };

  const handleAddMembers = async () => {
    if (newMembers.length === 0) return;

    setIsAddingMembers(true);

    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "PUT", // assuming you're using PUT here
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: newMembers,
          isCurrentUserAdmin: channel.currentUserName,
        }), // 👈 send array
      });

      const data = await response.json();
      console.log(data, "data");

      if (!response.ok) {
        throw new Error(data.message || "Failed to add members");
      }

      toast("Members added", {
        description: `${newMembers.length} new members added to the channel`,
      });

      setShowAddMembers(false);
      setNewMembers([]);
      router.refresh();
    } catch (error) {
      console.error("Error adding members:", error);
      toast("Error", {
        description: "Failed to add members",
      });
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handelDeleteMember = async (id: string) => {
    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "DELETE",
        body: JSON.stringify({ userId: id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      // ✅ Update local state to remove deleted member
      setMembers((prevMembers) => channel.members.filter((m) => m.id !== id));

      toast("Member Deleted", {
        description: "The member has been removed successfully.",
      });
      router.refresh();
    } catch (error) {
      console.error("Server Error:", error);
      toast("Error", {
        description: "Something went wrong while deleting the member.",
      });
    }
  };

  return (
    <div className="container max-w-4xl py-6 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-gray-100 p-3 rounded-lg mr-3">
            <Hash className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{channel.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {channel.isPublic ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  Public
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  Private
                </Badge>
              )}

              {channel.department && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {channel.department.name}
                </Badge>
              )}

              {channel.isTaskThread && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  Task Thread
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 dark:bg-gray-900">
          <Button variant="outline" onClick={toggleMute}>
            {isMuted ? (
              <BellOff className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {isMuted ? "Enable Notifications" : "Mute Channel"}
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/dashboard/channels/${channel.id}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Chat
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="about">
        <TabsList className="mb-4">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="members">
            Members ({channel.members.length})
          </TabsTrigger>
          {channel.task && <TabsTrigger value="task">Related Task</TabsTrigger>}
        </TabsList>

        <TabsContent value="about">
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
              <CardDescription>Details about this channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Created On
                  </h3>
                  <p className="mt-1">{channel.createdAt}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Last Activity
                  </h3>
                  <p className="mt-1">{channel.updatedAt}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Messages
                  </h3>
                  <p className="mt-1">{channel.messageCount}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Visibility
                  </h3>
                  <p className="mt-1">
                    {channel.isPublic
                      ? "Public - Anyone can join"
                      : "Private - Invitation only"}
                  </p>
                </div>
              </div>

              {channel.department && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Department
                  </h3>
                  <p className="mt-1">{channel.department.name}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {channel.isCurrentUserAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete Channel</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Channel</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this channel? This
                        action cannot be undone and all messages will be
                        permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteChannel}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Channel"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Channel Members</CardTitle>
              <CardDescription>
                People who have access to this channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channel.members.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-md"
                  >
                    <div className="flex items-center">
                      <UserAvatar user={member.user} size="md" />
                      <div className="ml-3">
                        <p className="font-medium">{member.user.namefddfdfd}</p>
                        <p className="text-sm text-gray-500">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {member.isAdmin && (
                        <Badge className="bg-blue-100 text-blue-800 border-none">
                          Admin
                        </Badge>
                      )}

                      {channel.isCurrentUserAdmin &&
                        member.userId !== channel.currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handelDeleteMember(member?.id)}
                          >
                            Remove
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            {channel.isCurrentUserAdmin && (
              <CardFooter>
                <Dialog
                  modal={false}
                  open={showAddMembers}
                  onOpenChange={setShowAddMembers}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Members</DialogTitle>
                      <DialogDescription>
                        Select users to add to this channel
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="members">Select Members</Label>
                      <UserMultiSelect
                        selectedUsers={newMembers}
                        onChange={setNewMembers}
                        excludeUserIds={channel.members.map(
                          (m: any) => m.userId
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddMembers(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddMembers}
                        disabled={isAddingMembers || newMembers.length === 0}
                      >
                        {isAddingMembers ? "Adding..." : "Add Members"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {channel.task && (
          <TabsContent value="task">
            <Card>
              <CardHeader>
                <CardTitle>Related Task</CardTitle>
                <CardDescription>
                  This channel was created for a specific task
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Task Title
                  </h3>
                  <p className="mt-1 font-medium">{channel.task.title}</p>
                </div>

                {channel.task.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Description
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap">
                      {channel.task.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Status
                    </h3>
                    <Badge className="mt-1" variant="outline">
                      {channel.task.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Priority
                    </h3>
                    <Badge className="mt-1" variant="outline">
                      {channel.task.priority}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Deadline
                    </h3>
                    <p className="mt-1">
                      {((channel.task as any).deadlineStart && (channel.task as any).deadlineEnd)
                        ? (((channel.task as any).deadlineStart !== (channel.task as any).deadlineEnd)
                            ? `${new Date((channel.task as any).deadlineStart).toLocaleDateString()} — ${new Date((channel.task as any).deadlineEnd).toLocaleDateString()}`
                            : new Date((channel.task as any).deadlineEnd).toLocaleDateString())
                        : (channel.task.deadline
                            ? new Date(channel.task.deadline).toLocaleDateString()
                            : "No deadline")}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Created By
                  </h3>
                  <div className="mt-1 flex items-center">
                    <UserAvatar user={channel.task.creator} size="sm" />
                    <span className="ml-2">{channel.task.creator.name}</span>
                  </div>
                </div>

                {channel.task.assignments &&
                  channel.task.assignments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Assigned To
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {channel.task.assignments.map((assignment: any) => (
                          <div
                            key={assignment.id}
                            className="flex items-center bg-gray-50 rounded-full px-3 py-1"
                          >
                            <UserAvatar user={assignment.user} size="sm" />
                            <span className="ml-2 text-sm">
                              {assignment.user.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={`/dashboard/tasks/${channel.task.id}`}>
                    View Task Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

//

//
//
//
//
//
