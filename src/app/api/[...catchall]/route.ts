import { NextResponse } from 'next/server';

/**
 * Catch-all API route — returns JSON for any unmatched /api/* request.
 * This prevents Next.js from returning its default HTML 404 page
 * when a frontend fetch() hits a non-existent endpoint.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'API endpoint not found' },
    { status: 404 },
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'API endpoint not found' },
    { status: 404 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'API endpoint not found' },
    { status: 404 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'API endpoint not found' },
    { status: 404 },
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'API endpoint not found' },
    { status: 404 },
  );
}
