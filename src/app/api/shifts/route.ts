import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/shifts - Get shifts
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const shifts = await db.shift.findMany({
      where: { organizationId },
      include: {
        employees: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                designation: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shifts - Create shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, startTime, endTime, graceMinutes, organizationId } = body;

    if (!name || !startTime || !endTime || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const shift = await db.shift.create({
      data: {
        name,
        startTime,
        endTime,
        graceMinutes: graceMinutes || 15,
        organizationId,
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shifts - Delete shift
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    // Delete shift (employee shifts will cascade)
    await db.shift.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
