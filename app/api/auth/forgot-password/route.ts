// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

   
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // To avoid revealing whether email exists, you can return a generic message
      return NextResponse.json({ ok: true });
      // Or to be explicit (less secure): return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Optionally: log the change, send an email notifying the user that password was changed
    // (Recommended: send notification so legitimate owner knows if changed without them)

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Immediate reset error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
