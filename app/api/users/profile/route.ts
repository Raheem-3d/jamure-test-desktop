import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

  const { name } = await req.json()
  const user: any = (session as any).user || {}

    // Update user
    const updated = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
