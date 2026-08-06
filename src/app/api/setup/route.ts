import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function isDatabaseConnected(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      configured: false,
      connected: false,
    }, { status: 503 });
  }

  try {
    const connected = await isDatabaseConnected();
    if (!connected) {
      return NextResponse.json({
        success: false,
        configured: true,
        connected: false,
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      connected: true,
    });
  } catch {
    return NextResponse.json({
      success: false,
      configured: true,
      connected: false,
    }, { status: 503 });
  }
}

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      error: 'DATABASE_URL is not set.',
    }, { status: 503 });
  }

  try {
    const connected = await isDatabaseConnected();
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed. Check your DATABASE_URL.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database is connected and ready!',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Setup error:', message);

    return NextResponse.json({
      success: false,
      error: 'Database connection failed. Check your DATABASE_URL.',
      debug: message.substring(0, 200),
    }, { status: 500 });
  }
}
