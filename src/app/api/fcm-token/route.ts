import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/fcm-token - Save FCM token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, token } = body;

    if (!userId || !role || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists and update FCM token
    if (role === 'employee') {
      await db.employee.update({
        where: { id: userId },
        data: { fcmToken: token },
      });
    } else if (role === 'admin') {
      await db.admin.update({
        where: { id: userId },
        data: { fcmToken: token },
      });
    }

    return NextResponse.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/fcm-token - Remove FCM token
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Remove FCM token
    if (role === 'employee') {
      await db.employee.update({
        where: { id: userId },
        data: { fcmToken: null },
      });
    } else if (role === 'admin') {
      await db.admin.update({
        where: { id: userId },
        data: { fcmToken: null },
      });
    }

    return NextResponse.json({ success: true, message: 'FCM token removed' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
