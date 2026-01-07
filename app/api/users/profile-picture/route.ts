

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function POST(req: Request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get file from request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Check if the file is an image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only image files are allowed" }, { status: 400 });
    }

    // File size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large. Max size 2MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExtension = file.name.split(".").pop() || "jpg";
    const publicId = `profiles/${uuidv4()}.${fileExtension}`;

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          public_id: publicId,
          folder: "profiles",
          overwrite: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    if (!uploadResult.secure_url) {
      throw new Error("Failed to upload image to Cloudinary.");
    }

    // Update user image in database
    await db.user.update({
      where: { id: user.id },
      data: { image: uploadResult.secure_url },
    });

    return NextResponse.json(
      { imageUrl: uploadResult.secure_url, message: "Profile picture updated" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};
