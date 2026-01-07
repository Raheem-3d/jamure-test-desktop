"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hash, Users, Lock, Plus, Search, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"

type Channel = {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  isDepartment: boolean
  createdAt: string
  _count: {
    members: number
    messages: number
  }
}



export default function AllChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/channels/all")

        if (response.ok) {
          const data = await response.json()
          setChannels(data)
        } else {
          throw new Error("Failed to fetch channels")
        }
      } catch (error) {
        console.error("Error fetching channels:", error)
        toast({
          title: "Error",
          description: "Failed to load channels",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchChannels()

    // Listen for real-time channel assignments
    const handleChannelAssigned = () => {
      fetchChannels()
    }

    window.addEventListener("channel:assigned", handleChannelAssigned)
    return () => {
      window.removeEventListener("channel:assigned", handleChannelAssigned)
    }
  }, [toast])





  const filteredChannels = channels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const publicChannels = filteredChannels.filter((channel) => channel.isPublic && !channel.isDepartment)
  const privateChannels = filteredChannels.filter((channel) => !channel.isPublic && !channel.isDepartment)
  const departmentChannels = filteredChannels.filter((channel) => channel.isDepartment)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">All Channels</h2>
        <Button asChild>
          <Link href="/dashboard/new-channel">
            <Plus className="h-4 w-4 mr-2" />
            New Channel
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Channels</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {filteredChannels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No channels found</p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/new-channel">Create a New Channel</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public">
            {publicChannels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No public channels found</p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/new-channel">Create a New Channel</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="private">
            {privateChannels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No private channels found</p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/new-channel">Create a New Channel</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {privateChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="department">
            {departmentChannels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No department channels found</p>
                {user?.role === "ORG_ADMIN" && (
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/settings">Manage Departments</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departmentChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {channel.isPublic ? (
              <Hash className="h-5 w-5 mr-2 text-gray-500" />
            ) : (
              <Lock className="h-5 w-5 mr-2 text-gray-500" />
            )}
            <CardTitle className="text-lg">{channel.name}</CardTitle>
          </div>
          {channel.isDepartment && (
            <Badge variant="outline" className="ml-2">
              Department
            </Badge>
          )}
        </div>
        <CardDescription>{channel.description || "No description"}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-gray-500">
          <Users className="h-4 w-4 mr-1" />
          <span>{channel._count.members} members</span>
          <span className="mx-2">•</span>
          <span>{channel._count.messages} messages</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/dashboard/channels/${channel.id}`}>Join Channel</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
