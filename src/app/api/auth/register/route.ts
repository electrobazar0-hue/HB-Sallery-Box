import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      password,
      securityPassword,
      name,
      phone,
      email,
      address,
      organizationName,
      organizationAddress,
      gst,
      profilePhoto,
    } = body;

    // Validate required fields
    if (!userId || !password || !securityPassword || !name || !phone || !organizationName || !organizationAddress) {
      return NextResponse.json({
        success: false,
        error: 'All required fields must be filled',
      }, { status: 400 });
    }

    // Check if userId already exists
    const existingAdminByUserId = await db.admin.findUnique({
      where: { userId },
    });
    if (existingAdminByUserId) {
      return NextResponse.json({
        success: false,
        error: 'User ID already exists. Please choose a different one.',
      }, { status: 400 });
    }

    // Check if phone already exists
    const existingAdminByPhone = await db.admin.findUnique({
      where: { phone },
    });
    if (existingAdminByPhone) {
      return NextResponse.json({
        success: false,
        error: 'Phone number already registered',
      }, { status: 400 });
    }

    // Hash password and security password
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityPassword = await bcrypt.hash(securityPassword, 10);

    // Create admin with organization in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create admin first
      const admin = await tx.admin.create({
        data: {
          userId,
          password: hashedPassword,
          securityPassword: hashedSecurityPassword,
          name,
          phone,
          email: email || null,
          address: address || null,
          profilePhoto: profilePhoto || null,
        },
      });

      // Create organization linked to admin
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          address: organizationAddress,
          gst: gst || null,
          adminId: admin.id,
        },
      });

      return { admin, organization };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.admin.id,
        userId: result.admin.userId,
        name: result.admin.name,
        phone: result.admin.phone,
        email: result.admin.email,
        role: 'admin',
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        profilePhoto: result.admin.profilePhoto,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed. Please try again.',
    }, { status: 500 });
  }
}
