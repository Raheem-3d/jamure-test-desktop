import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const departments = await db.department.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is org admin
    const user = await db.user.findUnique({
      where: {
        id: (session as any).user?.id || "",
      },
      select: {
        role: true,
      },
    })

    if (user?.role !== "ORG_ADMIN") {
      return NextResponse.json({ message: "Only organization admins can create departments" }, { status: 403 })
    }

    const { name } = await req.json()

    // Check if department already exists
    const existingDepartment = await db.department.findFirst({
      where: {
        name,
      },
    })

    if (existingDepartment) {
      return NextResponse.json({ message: "Department already exists" }, { status: 400 })
    }

    const department = await db.department.create({
      data: {
        name,
      },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error("Error creating department:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
