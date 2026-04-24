import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/admin - Get admin by phone, userId, or ID
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  const userId = request.nextUrl.searchParams.get('userId');
  const id = request.nextUrl.searchParams.get('id');
  
  if (!phone && !userId && !id) {
    return NextResponse.json({ error: 'Phone, User ID, or ID is required' }, { status: 400 });
  }

  try {
    let admin;

    if (userId) {
      admin = await db.admin.findUnique({ where: { userId }, include: { organization: true } });
    } else if (phone) {
      admin = await db.admin.findUnique({ where: { phone }, include: { organization: true } });
    } else {
      admin = await db.admin.findUnique({ where: { id: id! }, include: { organization: true } });
    }

    if (!admin) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      admin: {
        id: admin.id,
        userId: admin.userId,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        address: admin.address,
        profilePhoto: admin.profilePhoto,
        organization: admin.organization,
      },
    });
  } catch (error) {
    console.error('Error fetching admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin - Update admin
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      address: data.address,
      profilePhoto: data.profilePhoto,
    };

    // If password is provided, hash and update it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const admin = await db.admin.update({
      where: { id },
      data: updateData,
      include: { organization: true },
    });

    // Also update organization if provided
    if (data.organizationName && admin.organization?.id) {
      await db.organization.update({
        where: { id: admin.organization.id },
        data: { 
          name: data.organizationName,
          address: data.organizationAddress,
          gst: data.gst,
        },
      });
    }

    return NextResponse.json({ success: true, admin });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin - Delete admin (DISABLED - Admins cannot be deleted)
export async function DELETE(request: NextRequest) {
  try {
    // Deleting admins is not allowed - return error
    return NextResponse.json(
      { error: 'Admin deletion is not allowed.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error in delete route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
