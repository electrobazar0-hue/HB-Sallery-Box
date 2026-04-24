import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/leaves - Get leave requests
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const status = request.nextUrl.searchParams.get('status');
  
  try {
    let where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (organizationId) {
      where.employee = { organizationId };
    }

    if (status) {
      where.status = status;
    }

    const leaves = await db.leave.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leaves - Create leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, type, startDate, endDate, reason } = body;

    if (!employeeId || !type || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const leave = await db.leave.create({
      data: {
        employeeId,
        type,
        startDate,
        endDate,
        reason: reason || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error('Error creating leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/leaves - Approve/Reject leave
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy, attendanceAllow } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const leave = await db.leave.update({
      where: { id },
      data: {
        status,
        attendanceAllow: attendanceAllow !== undefined ? attendanceAllow : true,
        approvedBy: approvedBy || null,
        approvedAt: status !== 'pending' ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error('Error updating leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
