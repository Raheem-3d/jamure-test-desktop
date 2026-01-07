
// app/api/upload/[...path]/route.ts - File serving with Range support for video streaming
import { NextResponse } from 'next/server';
import { resolve } from 'path';
import { createReadStream, statSync, existsSync } from 'fs';
import { lookup } from 'mime-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeJoin(base: string, parts: string[]) {
  const p = require('path').resolve(base, ...parts);
  if (!p.startsWith(base)) throw new Error('Path traversal blocked');
  return p;
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const segments = (params.path || []).filter(Boolean);
    const base = resolve(process.cwd(), 'public', 'uploads');
    const filePath = safeJoin(base, segments);

    console.log('Serving upload:', segments.join('/')); // 🔎 debug

    if (!existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const stat = statSync(filePath);
    const fileSize = stat.size;
    const mime = (lookup(filePath) as string) || 'application/octet-stream';
    
    // Check if this is a video file that needs Range support
    const isVideo = mime.startsWith('video/');
    const rangeHeader = req.headers.get('range');

    // Handle Range requests for video streaming
    if (rangeHeader && isVideo) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse('Range Not Satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }
      
      const chunkSize = (end - start) + 1;
      const stream = createReadStream(filePath, { start, end });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600, immutable',
        },
      });
    }

    // For non-range requests or non-video files
    const stream = createReadStream(filePath);

    const headers: Record<string, string> = {
      'Content-Type': mime,
      'Content-Length': String(fileSize),
      'Cache-Control': 'public, max-age=3600, immutable',
    };

    // Always add Accept-Ranges header for video files
    if (isVideo) {
      headers['Accept-Ranges'] = 'bytes';
    }

    return new NextResponse(stream as any, {
      status: 200,
      headers,
    });
  } catch (e) {
    console.error('Upload serve error:', e);
    return new NextResponse('Not found', { status: 404 });
  }
}
