// app/api/upload/chunk/route.ts
// Chunked upload handler for large files (400MB+)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mkdir, writeFile, readdir, readFile, unlink } from "fs/promises";
import { join, resolve } from "path";
import { v4 as uuidv4 } from "uuid";
import Busboy from "busboy";
import { Readable as NodeReadable } from "stream";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Disable Next.js body parsing limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10000mb',
    },
  },
};

const CHUNK_DIR = resolve(process.cwd(), "public", "uploads", "chunks");
const UPLOADS_DIR = resolve(process.cwd(), "public", "uploads");

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const contentType = req.headers.get('content-type') || '';
    const nodeReq = NodeReadable.fromWeb(req.body as any);
    (nodeReq as any).headers = { 'content-type': contentType };

    let bb: any;
    try {
      bb = Busboy({ headers: (nodeReq as any).headers, limits: { fileSize: 10000 * 1024 * 1024 } });
    } catch (err: any) {
      console.error('Busboy init error:', err);
      return NextResponse.json({ success: false, message: 'Invalid multipart request', error: err?.message }, { status: 400 });
    }

    let chunkBuffer: Buffer | null = null;
    let chunkIndex: number = -1;
    let totalChunks: number = -1;
    let fileId: string = '';
    let fileName: string = '';
    let fileType: string = '';
    let busboyErrorOccurred = false;

    // Parse fields
    bb.on('field', (name: string, value: string) => {
      if (name === 'chunkIndex') chunkIndex = parseInt(value, 10);
      else if (name === 'totalChunks') totalChunks = parseInt(value, 10);
      else if (name === 'fileId') fileId = value;
      else if (name === 'fileName') fileName = value;
      else if (name === 'fileType') fileType = value;
    });

    // Parse file (chunk)
    bb.on('file', (_fieldname: string, file: NodeJS.ReadableStream, _info: any) => {
      const chunks: Buffer[] = [];
      file.on('data', (data: Buffer) => chunks.push(data));
      file.on('end', () => {
        chunkBuffer = Buffer.concat(chunks);
      });
    });

    const parseComplete = new Promise<void>((resolve) => {
      bb.on('finish', () => resolve());
      bb.on('close', () => resolve());
      bb.on('error', (e: any) => {
        console.warn('Busboy parse error:', e);
        busboyErrorOccurred = true;
        resolve();
      });
    });

    nodeReq.on('error', (err: any) => {
      console.warn('Request stream error:', err);
    });

    nodeReq.pipe(bb);
    
    try {
      await parseComplete;
    } catch (err) {
      console.warn('Stream processing error:', err);
    }

    if (!chunkBuffer || !fileId || !fileName || isNaN(chunkIndex) || isNaN(totalChunks)) {
      const message = busboyErrorOccurred 
        ? 'Chunk upload failed - possible network interruption. Retrying...'
        : 'Missing chunk data';
      console.error('Chunk validation failed:', { chunkBuffer: !!chunkBuffer, fileId, fileName, chunkIndex, totalChunks, busboyError: busboyErrorOccurred });
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    // Create chunks directory
    await mkdir(CHUNK_DIR, { recursive: true });
    await mkdir(UPLOADS_DIR, { recursive: true });

    // Save chunk
    const chunkPath = join(CHUNK_DIR, `${fileId}_chunk_${chunkIndex}`);
    await writeFile(chunkPath, chunkBuffer);

    console.log(`Saved chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);

    // Check if all chunks are uploaded
    const chunks = await readdir(CHUNK_DIR);
    const fileChunks = chunks.filter(name => name.startsWith(`${fileId}_chunk_`));

    if (fileChunks.length === totalChunks) {
      // All chunks received - merge them
      console.log(`All chunks received for ${fileName}, merging...`);

      const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? 'bin' : 'bin';
      const localName = `${uuidv4()}.${ext}`;
      const finalPath = join(UPLOADS_DIR, localName);

      // Sort chunks by index and merge
      const sortedChunks = fileChunks.sort((a, b) => {
        const aIndex = parseInt(a.split('_chunk_')[1], 10);
        const bIndex = parseInt(b.split('_chunk_')[1], 10);
        return aIndex - bIndex;
      });
//
      const buffers: Buffer[] = [];
      for (const chunkFile of sortedChunks) {
        const chunkData = await readFile(join(CHUNK_DIR, chunkFile));
        buffers.push(chunkData);
      }

      const finalBuffer = Buffer.concat(buffers);
      await writeFile(finalPath, finalBuffer);

      // Clean up chunks
      for (const chunkFile of sortedChunks) {
        try {
          await unlink(join(CHUNK_DIR, chunkFile));
        } catch (e) {
          console.warn(`Failed to delete chunk ${chunkFile}`);
        }
      }

      const origin = new URL('http://10.0.4.106:3000').origin;
      const fileUrl = `${origin}/u/${localName}`;

      console.log(`File merged successfully: ${finalPath}`);

      return NextResponse.json({
        success: true,
        complete: true,
        files: [{
          fileUrl,
          fileName,
          fileType,
          localName,
          size: finalBuffer.length,
        }],
      }, { status: 200 });
    }

    // Not all chunks received yet
    return NextResponse.json({
      success: true,
      complete: false,
      chunksReceived: fileChunks.length,
      totalChunks,
    }, { status: 200 });

  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Chunk upload failed",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
