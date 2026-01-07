export const dynamic = "force-dynamic"
export const revalidate = 0
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import ChannelHeader from "@/components/channel-header"
import RealTimeMessages from "@/components/real-time-messages"
import MessageInput from "@/components/message-input"
import DirectMessageClient from "@/components/DirectMessageClient"

export default async function ChannelPage({
  params,
}: {
  params: { channelId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const channel = await db.channel.findUnique({
    where: {
      id: params.channelId,
    },
    include: {
      department: true,
      members: {
        include: {
          user: true,
        },
      },
      task: true,
    },
  })

  if (!channel) {
    notFound()
  }

  // Check if user is a member of the channel
  const userId = (session as any)?.user?.id as string | undefined
  const isMember = channel.members.some((member: any) => member.userId === userId)

  if (!isMember && !channel.isPublic) {
    // If not a member and channel is private, redirect
    redirect("/dashboard")
  }

  // Get messages
  // Always fetch fresh messages to avoid stale caches after navigation/refresh
  const messages = await db.message.findMany({
    where: {
      channelId: channel.id,
    },
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  }) 
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
      <ChannelHeader channel={channel} />
      <div className="flex-1 min-h-0">
        <RealTimeMessages initialMessages={messages} channelId={channel.id} />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 p-3 border-t border-gray-300 dark:border-gray-600">
        <MessageInput channelId={channel.id} receiverId={undefined} />
      </div>
    </div>
  )
}
