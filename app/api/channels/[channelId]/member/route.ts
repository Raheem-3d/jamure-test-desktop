import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitToUser } from "@/lib/socket-server";
import { channel } from "diagnostics_channel";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { json } from "stream/consumers";

export async function DELETE(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  const session = await getServerSession(authOptions);
  const { channelId } = params;
  const body = await req.json();
  const { userId } = body;



  try {
    if (!session) {
      return NextResponse.json({ message: "Unauthorized!" }, { status: 401 });
    }



    if (!userId) {
      return NextResponse.json(
        { message: "Member ID not found." },
        { status: 400 }
      );
    }

    const deletedMember = await db.channelMember.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({
      message: "Member deleted successfully",
      data: deletedMember,
    });
  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json(
      { message: "Something went wrong!", error },
      { status: 500 }
    );
  }
}



export async function POST(req: Request,{ params }: { params: { channelId: string } }) {

  const session = await getServerSession(authOptions);
  const { channelId } = params;
  const { userId } = await req.json();

  try {
    if (!session) {
      return NextResponse.json({ message: "UnAuthorized." }, { status: 400 });
    }

    if (!channelId || !userId) {
      return NextResponse.json(
        { message: "Channel Id and user Id are required." },
        { status: 400 }
      );
    }

    const newMember = await db.channelMember.create({
      data: {
        channelId,
        userId,
      },
    });

    return NextResponse.json(
      { message: "Channel Member Add Successfully!" },
      { status: 201 }
    );
  } catch (error) {
    console.log(error, "Something Went Wrong!");
    return NextResponse.json({ message: "Server Error " }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  const session = await getServerSession(authOptions);
  const { channelId } = params;
  const { userIds,isCurrentUserAdmin } = await req.json();

  console.log(isCurrentUserAdmin,'isCurrentAdmin')

  try {
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (!channelId || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { message: "Channel ID and user IDs are required." },
        { status: 400 }
      );
    }

    // Get channel info (like name)
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ message: "Channel not found." }, { status: 404 });
    }

    const addedMembers = [];

    for (const userId of userIds) {
      const exists = await db.channelMember.findFirst({
        where: { channelId, userId },
      });

      if (!exists) {
        const newMember = await db.channelMember.create({
          data: { channelId, userId },
        });

        addedMembers.push(newMember);

        // ✅ Create Notification
        const notification = await db.notification.create({
          data: {
            type: "TASK_ASSIGNED",
            content: `You were added to channel "${channel.name}" by ${isCurrentUserAdmin}.`,
            userId: userId,
            read: false,
          },
        });

        // ✅ Emit notification
        emitToUser(userId, "new-notification", notification);

        // 🔡 Emit channel assignment event for real-time sidebar refresh
        emitToUser(userId, "channel:assigned", {
          channelId: channel.id,
          channelName: channel.name,
          channelDescription: channel.description,
        });

        console.log("🔔 Notification sent to:", userId);
      }
    }

    return NextResponse.json(
      {
        message: "Members added successfully.",
        addedCount: addedMembers.length,
        members: addedMembers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
