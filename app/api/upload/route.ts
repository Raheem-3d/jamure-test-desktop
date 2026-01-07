

// app/api/upload/route.ts (or similar)
// Requires Node.js server runtime (default) — not edge runtime
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { join, resolve } from "path";
import { v4 as uuidv4 } from "uuid";
import Busboy from "busboy";
import { Readable as NodeReadable } from "stream";

const MAX_FILES = 50;
const LOCAL_MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5GB

// Route configuration for large file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // up to 5 minutes for large uploads

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Log request details for debugging
    const contentType = req.headers.get('content-type') || '';
    const contentLength = req.headers.get('content-length');
    console.log('Upload request received:', {
      contentType,
      contentLength: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB` : 'unknown',
      hasBody: !!req.body,
    });

    const uploadsDir = resolve(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const origin = new URL('http://10.0.4.106:3000').origin;

    // Fallback: handle raw binary uploads (application/octet-stream)
    if (contentType.startsWith('application/octet-stream')) {
      const localName = `${uuidv4()}.bin`;
      const outPath = join(uploadsDir, localName);
      const writeStream = createWriteStream(outPath, { flags: 'w' });

      const body = req.body;
      if (!body) {
        return NextResponse.json({ success: false, message: 'No body' }, { status: 400 });
      }

      // Stream the request body directly to disk
      const nodeReadable = NodeReadable.fromWeb(body as any);
      const writeDone = new Promise<void>((resolveWrite, rejectWrite) => {
        writeStream.on('finish', () => resolveWrite());
        writeStream.on('error', (err) => rejectWrite(err));
      });
      nodeReadable.pipe(writeStream);
      await writeDone;

      const fileUrl = `${origin}/u/${localName}`;
      return NextResponse.json({ success: true, files: [{ fileUrl, fileName: null, fileType: 'application/octet-stream', localName, size: 0 }], failed: [] }, { status: 200 });
    }

    const files: Array<{ fileUrl: string; fileName: string; fileType: string | null; localName: string; size: number }> = [];
    const failed: Array<{ name: string; reason: string }> = [];
    const fileWrites: Promise<void>[] = [];

    // Convert the Web ReadableStream to Node stream for Busboy
    const nodeReq = NodeReadable.fromWeb(req.body as any);
    (nodeReq as any).headers = { 'content-type': contentType };

    let bb: any;
    try {
      // Busboy configuration with larger limits and better error handling
      bb = Busboy({ 
        headers: (nodeReq as any).headers,
        limits: { 
          files: MAX_FILES, 
          fileSize: LOCAL_MAX_BYTES,
          parts: MAX_FILES + 10, // Allow extra parts for form fields
        },
        // Don't process empty part boundaries that can cause "Unexpected end of form"
        preservePath: true,
      });
    } catch (err: any) {
      console.error('Busboy init error:', err);
      return NextResponse.json({ success: false, message: 'Invalid multipart request', error: err?.message }, { status: 400 });
    }

    let fileCount = 0;
    let busboyErrorOccurred = false;
    let streamEnded = false;

    bb.on('file', (_fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      if (streamEnded) {
        file.resume(); // Drain the stream to prevent backpressure
        return;
      }

      const { filename, mimeType } = info;
      fileCount += 1;
      if (fileCount > MAX_FILES) {
        failed.push({ name: filename, reason: `Too many files. Max ${MAX_FILES}` });
        file.resume();
        return;
      }

      // Prevent errors in filename from breaking parsing
      const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') : 'file';
      const ext = safeFilename && safeFilename.includes('.') ? safeFilename.split('.').pop()?.toLowerCase() ?? 'bin' : 'bin';
      const localName = `${uuidv4()}.${ext}`;
      const outPath = join(uploadsDir, localName);
      const writeStream = createWriteStream(outPath, { flags: 'w' });

      let received = 0;
      let fileSizeExceeded = false;
      let fileProcessed = false;

      file.on('data', (data: Buffer) => {
        if (fileSizeExceeded) return;
        received += data.length;
        if (received > LOCAL_MAX_BYTES) {
          fileSizeExceeded = true;
          failed.push({ name: filename, reason: 'File exceeds 5GB limit' });
          file.unpipe(writeStream);
          file.resume();
          try { writeStream.destroy(); } catch {}
        }
      });

      file.on('error', (err: any) => {
        console.warn(`Error reading file ${filename}:`, err?.message);
        file.resume();
        try { writeStream.destroy(); } catch {}
        if (!fileSizeExceeded) {
          failed.push({ name: filename, reason: err?.message || 'Read error' });
        }
      });

      if (!fileSizeExceeded) {
        file.pipe(writeStream);
      }

      const writePromise = new Promise<void>((resolveWrite) => {
        // Resolve on finish or error, don't reject to allow partial uploads
        const onFinish = () => {
          if (fileProcessed) return; // Prevent duplicate processing
          fileProcessed = true;
          
          if (!fileSizeExceeded) {
            const fileUrl = `${origin}/u/${localName}`;
            files.push({ fileUrl, fileName: filename, fileType: mimeType || null, localName, size: received });
            console.log('✅ Wrote file to:', outPath, `(${(received / 1024 / 1024).toFixed(2)}MB)`);
          }
          resolveWrite();
        };

        const onError = (err: any) => {
          if (fileProcessed) return; // Prevent duplicate error handling
          fileProcessed = true;
          
          console.warn(`❌ Error writing file ${filename}:`, err?.message);
          if (!fileSizeExceeded) {
            failed.push({ name: filename, reason: err?.message || 'Write failed' });
          }
          resolveWrite();
        };

        writeStream.on('finish', onFinish);
        writeStream.on('error', onError);
        writeStream.on('close', () => {
          if (!fileProcessed) onFinish();
        });
      });
      
      fileWrites.push(writePromise);
    });

    bb.on('error', (err: any) => {
      console.error('Busboy error:', err?.message);
      busboyErrorOccurred = true;
      streamEnded = true;
      // Mark all pending file writes to complete
      if (err?.message?.includes('Unexpected end of form')) {
        console.warn('Form parsing interrupted - likely network issue or truncated request');
      }
    });

    const finished = new Promise<void>((resolvePromise) => {
      const cleanup = () => {
        streamEnded = true;
        resolvePromise();
      };

      bb.on('finish', () => {
        console.log('Busboy finished successfully');
        cleanup();
      });

      bb.on('close', () => {
        console.log('Busboy stream closed');
        cleanup();
      });

      bb.on('error', (e: any) => {
        console.warn('Busboy stream error:', e?.message);
        // Don't resolve on error - wait for finish/close
      });

      // Timeout fallback
      setTimeout(() => {
        if (!streamEnded) {
          console.warn('Busboy stream timeout - forcing completion');
          cleanup();
        }
      }, 285000); // 285 seconds
    });

    nodeReq.on('error', (err: any) => {
      console.warn('Request stream error:', err?.message);
      streamEnded = true;
      if (err?.message?.includes('socket hang up') || err?.message?.includes('ECONNRESET')) {
        console.warn('Network disconnection detected');
      }
    });

    nodeReq.on('end', () => {
      console.log('Request stream ended');
    });

    // Start piping the request to Busboy
    nodeReq.pipe(bb);
    
    try {
      await finished;
      // Wait for all file writes to complete
      const results = await Promise.allSettled(fileWrites);
      const rejected = results.filter(r => r.status === 'rejected');
      if (rejected.length > 0) {
        console.warn(`${rejected.length} file writes failed`);
      }
    } catch (err) {
      console.warn('Stream processing error (continuing with partial results):', err);
    }

    if (files.length === 0 && failed.length === 0) {
      const message = busboyErrorOccurred 
        ? 'Upload failed - possible network interruption. The request body may have been truncated. Please try:\n1. Uploading smaller files\n2. Uploading one file at a time\n3. Checking your network connection\n4. Restarting your browser'
        : 'No file(s) provided';
      return NextResponse.json({ success: false, message }, { status: busboyErrorOccurred ? 422 : 400 });
    }

    // Deduplicate files by localName (in case of duplicate events)
    const uniqueFiles: typeof files = [];
    const seenLocalNames = new Set<string>();
    for (const file of files) {
      if (!seenLocalNames.has(file.localName)) {
        uniqueFiles.push(file);
        seenLocalNames.add(file.localName);
      } else {
        console.warn(`⚠️ Deduplicated duplicate file: ${file.localName}`);
      }
    }

    // Return 200 as long as at least one file succeeded
    const status = uniqueFiles.length > 0 ? 200 : 500;
    const success = uniqueFiles.length > 0 && failed.length === 0 ? true : uniqueFiles.length > 0;
    
    const responseData: any = { success, files: uniqueFiles, failed };
    if (busboyErrorOccurred && uniqueFiles.length > 0) {
      responseData.warning = 'Some files may have been incomplete due to network issues';
    }
    
    console.log('📤 Upload response:', { 
      status, 
      success, 
      filesCount: uniqueFiles.length,
      originalFilesCount: files.length,
      failedCount: failed.length,
      deduplicatedCount: files.length - uniqueFiles.length,
      files: uniqueFiles.map(f => ({ fileName: f.fileName, size: f.size }))
    });
    
    return NextResponse.json(responseData, { status });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
