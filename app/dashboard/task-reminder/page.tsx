
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreateReminderForm } from "@/components/create-reminder-form";
// import { CreateReminderForm } from "@/components/create-reminder-form"

export default async function CreateReminderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });

  //

  if (!currentUser) {
    redirect("/login");
  }

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
  });

  return <CreateReminderForm currentUser={currentUser} users={users} />;
}
