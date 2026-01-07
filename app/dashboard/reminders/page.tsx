

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { RemindersDashboard } from "@/components/reminders-dashboard"

export default async function RemindersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  // Fetch current user details
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  })

  if (!currentUser) {
    redirect("/login")
  }

  // Fetch reminders for the user
  const reminders = await db.reminder.findMany({
    where: {
      OR: [
        { assigneeId: session.user.id },
        { creatorId: session.user.id },
        ...(currentUser.role === "ADMIN" ? [{}] : []),
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      remindAt: "asc",
    },
  })

  // Fetch all users for assignment dropdown
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  return <RemindersDashboard currentUser={currentUser} reminders={reminders} users={users} />
}
