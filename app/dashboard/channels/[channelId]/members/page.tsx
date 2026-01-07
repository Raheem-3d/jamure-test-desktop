"use client";

import { use } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Crown, Loader2, MessageSquare, UserPlus, Users, UserX } from "lucide-react";
import { toast } from "sonner";
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
import { UserMultiSelect } from "@/components/user-multi-select";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import Link from "next/link";
type Channel = {
  id: string;
  members: Array<{
    id: string;
    userId: string;
    isAdmin: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ChannelMembersTab(props: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(props.params); // ✅ This is the fix

  const [channel, setChannel] = useState<Channel | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  // Local members derive from channel; avoid separate source of truth



  const fetchChannel = async () => {
    try {
      const response = await fetch(`/api/channels/${channelId}`);
      if (!response.ok) throw new Error("Failed to fetch channel");
      const data = await response.json();
      console.log(data.channel, "data");
      setChannel(data.channel);
    } catch (error) {
      toast.error("Error fetching channel");
    }
  };

  useEffect(() => {
    fetchChannel();
  }, [channelId]);


    if (!channel) return <div>Loading...</div>;
  const isAdmin = channel.members.some(
    (member: any) => member.userId === user?.id && member.isAdmin
  );




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
        isCurrentUserAdmin:channel.currentUserName
       }),
    });

    const data = await response.json();
    console.log(data,'data')
    if (!response.ok) {
      throw new Error(data.message || "Failed to add members");
    }

    toast("Members added", {
      description: `${newMembers.length} new members added to the channel`,
    });
    // Refresh local state without full page reload
    await fetchChannel();
    setShowAddMembers(false);
    setNewMembers([]);

    // Notify any listeners that members have changed
    try { window.dispatchEvent(new CustomEvent('channel:members-updated', { detail: { channelId: channel.id } })) } catch {}
  } catch (error) {
    console.error("Error adding members:", error);
    toast("Error", {
      description: "Failed to add members",
    });
  } finally {
    setIsAddingMembers(false);
  }
};




   const handleRemoveMember = async (id: string) => {
    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "DELETE",
        body: JSON.stringify({ userId: id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      // ✅ Update local state to remove deleted member
      setChannel((prev) => prev ? { ...prev, members: prev.members.filter((m: any) => m.id !== id) } as any : prev);

      toast("Member Deleted", {
        description: "The member has been removed successfully.",
      });
      // Optional: notify listeners
      try { window.dispatchEvent(new CustomEvent('channel:members-updated', { detail: { channelId: channel.id } })) } catch {}
    } catch (error) {
      console.error("Server Error:", error);
      toast("Error", {
        description: "Something went wrong while deleting the member.",

      });
    }
  };


 

  return (
 
 <div className="container max-w-4xl py-6 dark:bg-slate-900">
  <div className="flex items-center justify-between mb-6"></div>

  <Tabs defaultValue="members">
    <TabsList className="mb-4 w-full bg-gray-50 p-1 rounded-lg dark:bg-slate-800 dark:border dark:border-slate-700">
      <TabsTrigger 
        value="members" 
        className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white dark:data-[state=active]:shadow-lg transition-all rounded-lg"
      >
        <Users className="h-4 w-4 mr-2" />
        Members ({channel.members.length})
      </TabsTrigger>
    </TabsList>

   
    <TabsContent value="members" className="mt-6">
      <Card className="shadow-sm border-0 bg-white rounded-xl overflow-hidden dark:bg-slate-800 dark:border dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
          <CardTitle className="flex items-center text-xl dark:text-white">
            <Users className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Channel Members
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-slate-300">
            People who have access to this channel
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 dark:bg-slate-800">
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {channel.members.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-150 dark:hover:bg-slate-700/70"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative">
                    <UserAvatar user={member.user} size="md" />
                    {member.isAdmin && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 dark:bg-blue-600">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center">
                      <p className="font-medium text-gray-900 truncate dark:text-white">
                        {member.user.name}
                      </p>
                      {member.isAdmin && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 border-none text-xs py-0 dark:bg-blue-900/50 dark:text-blue-300">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate dark:text-slate-400">
                      {member.user.email}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="whitespace-nowrap dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:text-white"
                    >
                      <Link href={`/dashboard/messages/${user.id}`}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Link>
                    </Button>
                    
                    {isAdmin && member.userId !== channel.currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member?.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                      >
                        <UserX className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        
        {isAdmin && (
          <CardFooter className="bg-gray-50 border-t p-4 dark:bg-slate-800 dark:border-slate-700">
            <Dialog
              modal={false}
              open={showAddMembers}
              onOpenChange={setShowAddMembers}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Members
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-xl dark:bg-slate-800 dark:border-slate-700">
                <DialogHeader>
                  <DialogTitle className="flex items-center dark:text-white">
                    <UserPlus className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Add Members
                  </DialogTitle>
                  <DialogDescription className="dark:text-slate-300">
                    Select users to add to this channel
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <Label htmlFor="members" className="text-sm font-medium text-gray-700 mb-2 block dark:text-slate-300">
                    Select Members
                  </Label>
                  <UserMultiSelect
                    selectedUsers={newMembers}
                    onChange={setNewMembers}
                    excludeUserIds={channel.members.map(
                      (m: any) => m.userId
                    )}
                  />
                </div>
                
                <DialogFooter className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddMembers(false)}
                    className="flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMembers}
                    disabled={isAddingMembers || newMembers.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    {isAddingMembers ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Members"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>
    </TabsContent>
  </Tabs>
</div>
  );
}
