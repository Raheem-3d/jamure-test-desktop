import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser, getOrganizationContext } from "@/lib/org"

export async function GET(req: Request) {
  try {
    const user = await getSessionUser(req as any)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { organizationId } = await getOrganizationContext(req as any)
    if (!organizationId) {
      return NextResponse.json({ organization: null })
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        themeColor: true,
      },
    })

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
