
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Hash,
  Users,
  Info,
  Settings,
  Trash2,
  Bell,
  BellOff,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageSummarizer } from "@/components/message-summarizer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";

type ChannelHeaderProps = {
  channel: any;
};

export default function ChannelHeader({ channel }: ChannelHeaderProps) {
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState(channel.members); // ✅ Initialize with channel.members
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = channel.members?.some(
    (member: any) => member.userId === user?.id && member.isAdmin
  );

  const handleDeleteChannel = async () => {
    if (!isAdmin) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete channel");
      }

      toast.success("Channel Deleted", {
        description: "The channel has been deleted successfully",
      });
      
       window.location.reload();
       router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error("Error", {
        description: "Failed to delete channel",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: memberId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      // ✅ Update local state to remove deleted member
      setMembers((prevMembers: any) => 
        prevMembers.filter((m: any) => m.id !== memberId)
      );

      toast.success("Member Removed", {
        description: "The member has been removed successfully.",
      });
      router.refresh();
    } catch (error) {
      console.error("Server Error:", error);
      toast.error("Error", {
        description: "Something went wrong while removing the member.",
      });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Notifications Enabled" : "Notifications Muted", {
      description: isMuted
        ? "You will now receive notifications for this channel"
        : "You will no longer receive notifications for this channel",
    });
  };

  // Use members state for display
  const displayMembers = members || channel.members || [];

  return (
    <div>
      <motion.div
        className="px-4 py-3 border-b flex items-center justify-between bg-white shadow-sm dark:bg-gray-800 dark:text-[#f5f5f5]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
       
      
   



        <div className="flex items-center">
          <div className="bg-gray-100 p-2 rounded-md mr-3 dark:bg-gray-700 flex items-center justify-center">

                    <Button
      variant="outline"
      size="sm"
      className="h-10 w-10 p-0 mx-4"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>

            <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />

    
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-[#f5f5f5]">
              {channel.name}
            </h2>
            <div className="flex items-center space-x-2">
              {channel.department && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
                >
                  {channel.department.name}
                </Badge>
              )}
              {channel.isTaskThread && channel.task && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700"
                >
                  Task Thread
                </Badge>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {displayMembers.length} members
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* AI Summary Button */}
          <MessageSummarizer channelId={channel.id} limit={50} />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMembers(true)}
            className="dark:hover:bg-gray-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Members
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMute}
            className="dark:hover:bg-gray-700"
          >
            {/* {isMuted ? (
              <BellOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )} */}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="dark:hover:bg-gray-700"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className="dark:bg-gray-800 dark:border-gray-700"
            >
              <DropdownMenuItem asChild className="dark:hover:bg-gray-700">
                <Link
                  href={`/dashboard/channels/${channel.id}/info`}
                  className="flex items-center"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Channel Info
                </Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem
                onClick={toggleMute}
                className="flex items-center dark:hover:bg-gray-700"
              >
                {isMuted ? (
                  <Bell className="h-4 w-4 mr-2" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                {isMuted ? "Enable Notifications" : "Mute Notifications"}
              </DropdownMenuItem> */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="dark:bg-gray-600" />
                  <DropdownMenuItem asChild className="dark:hover:bg-gray-700">
                    <Link
                      href={{
                        pathname: `/dashboard/channels/${channel.id}/edit`,
                        query: { data: JSON.stringify(channel) },
                      }}
                      className="flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Channel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Channel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Channel Members</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {displayMembers.length} members in this channel
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <div className="space-y-4 py-2">
              {displayMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage
                        src={member.user?.image || ""}
                        alt={member.user?.name}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {member.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/dashboard/messages/${member.userId}`}
                        className="hover:underline"
                      >
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {member.user?.name || "Unknown User"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.user?.email || "No email"}
                        </p>
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {member.isAdmin && (
                      <Badge className="bg-blue-100 text-blue-800 border-none dark:bg-blue-900 dark:text-blue-200">
                        Admin
                      </Badge>
                    )}
                    {isAdmin && member.userId !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isAdmin && (
            <DialogFooter>
              <Button asChild>
                <Link href={`/dashboard/channels/${channel.id}/members`}>
                  Manage Members
                </Link>
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="dark:bg-gray-800 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Delete Channel</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Are you sure you want to delete this channel? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}