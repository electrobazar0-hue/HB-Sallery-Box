import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dateTo24HourFormatWithSeconds } from '@/lib/time-utils';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

// GET /api/breaks - Get break records for an employee
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const attendanceId = request.nextUrl.searchParams.get('attendanceId');

  if (!employeeId) {
    return noStoreJson({ error: 'Employee ID is required' }, { status: 400 });
  }

  try {
    const whereClause: Record<string, unknown> = { employeeId };
    if (attendanceId) whereClause.attendanceId = attendanceId;

    const breaks = await db.breakRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const activeBreak = breaks.find((b) => b.status === 'active') || null;

    return noStoreJson({ success: true, breaks, activeBreak });
  } catch (error) {
    console.error('Error fetching breaks:', error);
    return noStoreJson({ error: 'Failed to fetch breaks' }, { status: 500 });
  }
}

// POST /api/breaks - Start or End break
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, employeeId, attendanceId, type, breakId } = body;

    if (!employeeId) {
      return noStoreJson({ error: 'Employee ID is required' }, { status: 400 });
    }

    const now = new Date();
    const timeStr = dateTo24HourFormatWithSeconds(now);

    // Action 1: START Break
    if (action === 'start') {
      // Check if there is already an active break
      const existingActive = await db.breakRecord.findFirst({
        where: { employeeId, status: 'active' },
      });

      if (existingActive) {
        return noStoreJson({ success: true, message: 'Break is already in progress', break: existingActive });
      }

      const newBreak = await db.breakRecord.create({
        data: {
          employeeId,
          attendanceId: attendanceId || null,
          startTime: timeStr,
          type: type || 'lunch',
          status: 'active',
        },
      });

      return noStoreJson({ success: true, message: 'Break started', break: newBreak });
    }

    // Action 2: END Break
    if (action === 'end') {
      const activeBreak = breakId
        ? await db.breakRecord.findUnique({ where: { id: breakId } })
        : await db.breakRecord.findFirst({
            where: { employeeId, status: 'active' },
            orderBy: { createdAt: 'desc' },
          });

      if (!activeBreak) {
        return noStoreJson({ error: 'No active break found to end' }, { status: 404 });
      }

      // Calculate duration
      let durationMinutes = 0;
      try {
        const startParts = activeBreak.startTime.split(':').map(Number);
        const endParts = timeStr.split(':').map(Number);
        const startSec = startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
        const endSec = endParts[0] * 3600 + endParts[1] * 60 + (endParts[2] || 0);
        let diffSec = endSec - startSec;
        if (diffSec < 0) diffSec += 86400;
        durationMinutes = Math.round((diffSec / 60) * 10) / 10;
      } catch {}

      const updated = await db.breakRecord.update({
        where: { id: activeBreak.id },
        data: {
          endTime: timeStr,
          durationMinutes,
          status: 'completed',
        },
      });

      return noStoreJson({ success: true, message: 'Break ended', break: updated });
    }

    return noStoreJson({ error: 'Invalid action. Must be "start" or "end"' }, { status: 400 });
  } catch (error) {
    console.error('Error processing break action:', error);
    return noStoreJson({ error: 'Failed to process break' }, { status: 500 });
  }
}
