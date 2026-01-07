import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { format } from "date-fns"
import { ChannelInfoDisplay } from "@/components/channel-info-display"

export default async function ChannelInfoPage({ params }: { params: { channelId: string } }) {
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
      task: {
        include: {
          creator: true,
          assignments: {
            include: {
              user: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  })

  if (!channel) {
    notFound()
  }


  console.log(session,'session')



  // Check if user is a member of the channel
  const isMember = channel.members.some((member) => member.userId === session.user.id)
  const isAdmin = channel.members.some((member) => member.userId === session.user.id && member.isAdmin)
const currentMember = channel.members.find(
  (member) => member.user.name === session.user?.name
)

const userId = currentMember?.userId


  if (!isMember && !channel.isPublic) {
    // If not a member and channel is private, redirect
    redirect("/dashboard")
  }

  // Format channel data for the component
  const channelData = {
    ...channel,
    createdAt: format(new Date(channel.createdAt), "PPP"),
    updatedAt: format(new Date(channel.updatedAt), "PPP"),
    messageCount: channel._count.messages,
    currentUserId: userId,
    currentUserName:session.user?.name,
    isCurrentUserAdmin: isAdmin || session.user?.role === "ORG_ADMIN",
  }

  return <ChannelInfoDisplay channel={channelData} />
}
