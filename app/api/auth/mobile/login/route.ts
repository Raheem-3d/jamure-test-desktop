import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isSuperAdmin } from '@/lib/org';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user with organization details
    const user = await db.user.findUnique({
      where: { email },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const userIsSuperAdmin = user.isSuperAdmin || isSuperAdmin(user.email);

    // Generate JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not defined');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        isSuperAdmin: userIsSuperAdmin,
      },
      secret,
      { expiresIn: '7d' }
    );

    // Prepare organization data
    const organizationData = user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          role: user.role,
          suspended: (user.organization as any).suspended || false,
          subscription: user.organization.subscription
            ? {
                status: user.organization.subscription.status,
                currentPeriodEnd: user.organization.subscription.currentPeriodEnd,
                trialEnd: user.organization.subscription.trialEnd,
              }
            : null,
        }
      : null;

    // Return user data and token
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        departmentId: user.departmentId,
        organizationId: user.organizationId,
        isSuperAdmin: userIsSuperAdmin,
        organizations: organizationData ? [organizationData] : [],
      },
      token,
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




