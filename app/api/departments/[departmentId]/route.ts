import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { departmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admins can update departments" },
        { status: 403 }
      );
    }

    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Department name is required" },
        { status: 400 }
      );
    }

    // Update department
    const updatedDepartment = await db.department.update({
      where: { id: params.departmentId },
      data: { name },
    });

    return NextResponse.json(updatedDepartment);
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { departmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is org admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "ORG_ADMIN") {
      return NextResponse.json(
        { message: "Only organization admins can delete departments" },
        { status: 403 }
      );
    }

    // Check if department has users
    const departmentUsers = await db.user.findMany({
      where: { departmentId: params.departmentId },
    });

    if (departmentUsers.length > 0) {
      return NextResponse.json(
        { message: "Cannot delete department with assigned users" },
        { status: 400 }
      );
    }

    // Delete department
    await db.department.delete({
      where: { id: params.departmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
