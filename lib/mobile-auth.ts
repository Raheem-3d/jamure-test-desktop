import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export interface MobileAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId: string | null;
  departmentId: string | null;
  isSuperAdmin: boolean;
  permissions: any[];
}

/**
 * Verify JWT token from mobile app and return user data
 * Usage in API routes:
 * 
 * const user = await verifyMobileToken(request);
 * if (!user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 */
export async function verifyMobileToken(
  request: NextRequest | Request
): Promise<MobileAuthUser | null> {
  try {
    // Try both lowercase and capitalized 'Authorization' header
    let authHeader = null;
    if ((request as any).headers?.get) {
      authHeader = (request as any).headers.get('authorization') || (request as any).headers.get('Authorization');
    } else {
      authHeader = (request as any).headers?.authorization || (request as any).headers?.Authorization || null;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[mobile-auth] No valid Authorization header found');
      return null;
    }

    const token = authHeader.substring(7);

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not defined');
      return null;
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
      organizationId: string | null;
      role: string;
      isSuperAdmin: boolean;
    };

    // Fetch fresh user data from database
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        departmentId: true,
        isSuperAdmin: true,
        permissions: true,
      },
    });

    if (!user) {
      return null;
    }

    // Parse permissions - handle both array and JSON string formats
    let parsedPermissions: any[] = []
    if (Array.isArray(user.permissions)) {
      parsedPermissions = user.permissions as any[]
    } else if (typeof user.permissions === 'string' && user.permissions) {
      try {
        parsedPermissions = JSON.parse(user.permissions)
      } catch {
        parsedPermissions = []
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      isSuperAdmin: user.isSuperAdmin,
      permissions: parsedPermissions,
    };
  } catch (error) {
    console.error('Mobile token verification error:', error);
    return null;
  }
}

/**
 * Extract user ID from JWT token without full verification
 * Useful for less critical operations
 */
export function extractUserIdFromToken(request: NextRequest): string | null {
  try {
    // Try both lowercase and capitalized 'Authorization' header
    let authHeader = null;
    if ((request as any).headers?.get) {
      authHeader = (request as any).headers.get('authorization') || (request as any).headers.get('Authorization');
    } else {
      authHeader = (request as any).headers?.authorization || (request as any).headers?.Authorization || null;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const secret = process.env.NEXTAUTH_SECRET;
    
    if (!secret) {
      return null;
    }

    const decoded = jwt.verify(token, secret) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

/**
 * Try to obtain a session-based user or, if that fails, verify a mobile JWT.
 * Returns an object matching the shape of `session.user` or `null`.
 */
export async function getSessionOrMobileUser(request: Request): Promise<any | null> {
  try {
    // Try NextAuth session first
    const session = await getServerSession(authOptions as any)
    if (session && (session as any).user) return (session as any).user
  } catch (e) {
    // ignore and fallback to mobile token
  }

  // Fallback: verify mobile JWT from Authorization header
  try {
    const mobileUser = await verifyMobileToken(request as any);
    if (mobileUser) {
      // map MobileAuthUser -> session-like user
      return {
        id: mobileUser.id,
        email: mobileUser.email,
        name: mobileUser.name,
        role: mobileUser.role,
        organizationId: mobileUser.organizationId,
        departmentId: mobileUser.departmentId,
        isSuperAdmin: mobileUser.isSuperAdmin,
        permissions: mobileUser.permissions || [],
      }
    }
  } catch (e) {
    console.warn('getSessionOrMobileUser mobile verify error:', e)
  }

  return null
}
