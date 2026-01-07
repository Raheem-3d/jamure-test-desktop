import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSocket } from "@/lib/socket-client"

type UserAvatarProps = {
  user: {
    id: string
    name?: string | null
    image?: string | null
  }
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
}

export function UserAvatar({ user, size = "md", showStatus = true }: UserAvatarProps) {
  const { onlineUsers } = useSocket()
  const isOnline = onlineUsers.includes(user.id)

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  const statusSizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  }

  return (
    <div className="relative">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user.image || ""} alt={user.name || "User"} />
        <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
      </Avatar>

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  )
}
