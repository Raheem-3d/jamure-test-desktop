import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreateReminderForm } from "@/components/create-reminder-form";
// import { CreateReminderForm } from "@/components/create-reminder-form"

export default async function CreateReminderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id as string;

  if (!userId) {
    redirect("/login");
  }

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      organizationId: true,
    },
  });

  //

  if (!currentUser) {
    redirect("/login");
  }

  // Filter users based on role
  let users;
  if (currentUser.role === "SUPER_ADMIN") {
    // Super admin can see all users
    users = await db.user.findMany({
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
    });
  } else if (currentUser.role === "ORG_ADMIN") {
    // Org admin can only see users from their organization (excluding SUPER_ADMIN)
    users = await db.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        role: {
          not: "SUPER_ADMIN",
        },
      },
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
    });
  } else {
    // Other users can only assign to themselves
    users = await db.user.findMany({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });
  }

  return <CreateReminderForm currentUser={currentUser} users={users} />;
}
