import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";



export async function GET( request: NextRequest,  { params }: { params: { channelId: string } } ) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = params;

    const user: any = (session as any).user
    const channelData = await db.channel.findFirst({
      where: {
        id: channelId,
        organizationId: user?.organizationId || undefined,
      },
      include: {
        members: {
        include: {
          user: true,
        },
      },
        department: true,
      },
    });

    return NextResponse.json({ channel: channelData });
  } catch (error) {
    console.error("Error fetching channel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = params;
    const user: any = (session as any).user

    if (!channelId) {
      return NextResponse.json(
        { message: "Channel ID not provided" },
        { status: 400 }
      );
    }

    // Ensure the channel belongs to the organization
    const existing = await db.channel.findFirst({ where: { id: channelId, organizationId: user?.organizationId || undefined } })
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    const deleteChannel = await db.channel.delete({ where: { id: channelId } });

    return NextResponse.json(
      { message: "Channel deleted", data: deleteChannel },
      { status: 200 }
    );
  } catch (error) {
    console.error("Channel Delete Error:", error);
    return NextResponse.json(
      { message: "Server error deleting channel", error: String(error) },
      { status: 500 }
    );
  }
}




export async function PUT(req: Request, { params }: { params: { channelId: string } }) {
  const { channelId } = params;
  const body = await req.json();
  const session = await getServerSession(authOptions as any)
  const user: any = (session as any)?.user

  const {
    name,
    description,
    departmentId,
    isPublic,
    members, // userIds
  } = body;

  try {
    // Ensure the channel belongs to the org
    const existing = await db.channel.findFirst({ where: { id: channelId, organizationId: user?.organizationId || undefined } })
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    // Normalize and validate department id
    let depId: string | null = null
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'none') {
      const dept = await db.department.findUnique({ where: { id: departmentId }, select: { id: true } })
      depId = dept ? departmentId : null
    }

    const updatedChannel = await db.channel.update({
      where: { id: channelId },
      data: {
        name,
        description,
        departmentId: depId,
        isPublic,
        updatedAt: new Date(),
        members: {
          deleteMany: {}, // remove existing
        },
      },
    });

    // Re-add members
    const newMembers = members.map((userId: string) => ({
      userId,
      channelId: updatedChannel.id,
    }));

    await db.channelMember.createMany({
      data: newMembers,
      skipDuplicates: true,
    });

    return NextResponse.json({ channel: updatedChannel }, { status: 200 });
  } catch (error) {
    console.error("[CHANNEL_UPDATE_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to update channel" },
      { status: 500 }
    );
  }
}