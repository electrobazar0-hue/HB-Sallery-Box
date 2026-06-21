import { NextRequest, NextResponse } from 'next/server';

// POST /api/fcm-token - Save FCM token (no-op - FCM field not in schema)
export async function POST(request: NextRequest) {
  try {
    // FCM token storage not available in current schema
    // This endpoint exists for compatibility but does nothing
    return NextResponse.json({ success: true, message: 'FCM token acknowledged' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/fcm-token - Remove FCM token (no-op)
export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, message: 'FCM token acknowledged' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}