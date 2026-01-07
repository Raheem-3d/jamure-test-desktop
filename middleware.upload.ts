import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middlewareUploadHandler(req: NextRequest) {
  // For upload requests, we need to let them pass through without body size restrictions
  // The actual body parsing happens in the route handler
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/upload/:path*'],
}
