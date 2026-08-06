import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dateTo24HourFormatWithSeconds } from '@/lib/time-utils';

function getLocalDateKey(value: unknown) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value ? new Date(value as string | number | Date) : new Date();
  if (isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function secondsFromTime(time: string) {
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) return null;
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
}

function workSecondsBetween(startDate: string, startTime: string, endDate: string, endTime: string) {
  const startSeconds = secondsFromTime(startTime);
  const endSeconds = secondsFromTime(endTime);
  if (startSeconds == null || endSeconds == null) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const daySeconds = Math.round((end.getTime() - start.getTime()) / 1000);
  return daySeconds + endSeconds - startSeconds;
}

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const date = request.nextUrl.searchParams.get('date');
  const month = request.nextUrl.searchParams.get('month');
  
  try {
    let where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (organizationId) {
      where.employee = { organizationId };
    }

    if (date) {
      where.date = date;
    }

    const attendance = await db.attendance.findMany({
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
      orderBy: [
        { date: 'desc' },
        { punchIn: 'desc' },
      ],
    });

    // Filter by month prefix if needed
    let result = attendance;
    if (month && !date) {
      result = attendance.filter(a => a.date.startsWith(month));
    }

    return NextResponse.json(
      { attendance: result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/attendance - Punch in/out with LOCAL timestamp (device time, not GPS UTC)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId, type,
      latitude, longitude, photo,
      timestamp,    // LOCAL timestamp from frontend (device time, not GPS UTC)
      localDate,    // Local date as YYYY-MM-DD from frontend
      localTime,    // Local time as formatted string (HH:MM:SS) - matches user's timezone
      accuracy,     // GPS accuracy in meters
    } = body;

    console.log('Attendance punch request:', { employeeId, type, timestamp, localTime, accuracy });

    // Validate required fields
    if (!employeeId || !type) {
      console.error('Missing required fields:', { employeeId, type });
      return NextResponse.json({ error: 'Missing required fields: employeeId and type are required' }, { status: 400 });
    }

    if (type !== 'in' && type !== 'out') {
      console.error('Invalid punch type:', type);
      return NextResponse.json({ error: 'Invalid punch type. Must be "in" or "out"' }, { status: 400 });
    }

    // Use LOCAL timestamp from device (matches user's local timezone)
    const now = timestamp ? new Date(timestamp) : new Date();
    const date = getLocalDateKey(localDate) || getLocalDateKey(now);

    // Validate timestamp
    if (isNaN(now.getTime()) || !date) {
      console.error('Invalid timestamp:', timestamp);
      return NextResponse.json({ error: 'Invalid timestamp provided' }, { status: 400 });
    }

    // Use localTime string if provided (matches user's timezone), otherwise format it
    const time = localTime || dateTo24HourFormatWithSeconds(now);
    const displayTime = time; // Return full time with seconds to frontend
    const shortTime = time.slice(0, 5); // For backward compatibility (HH:MM)

    if (type === 'in') {
      // Check if already punched in
      let existing = await db.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
      });

      if (existing && existing.punchIn) {
        console.log('Already punched in for today:', existing.punchIn);
        return NextResponse.json({ error: 'Already punched in for today' }, { status: 400 });
      }

      if (existing) {
        // Update existing record
        const attendance = await db.attendance.update({
          where: { id: existing.id },
          data: {
            punchIn: time,
            punchInLat: latitude,
            punchInLng: longitude,
            punchInPhoto: photo,
            status: 'present',
          },
        });
        console.log('Updated attendance record:', attendance.id);
        return NextResponse.json({
          success: true,
          attendance,
          time: shortTime, // For backward compatibility
          accurateTime: displayTime, // Full time with seconds
          accuracy // Location accuracy in meters
        });
      } else {
        // Create new record
        const attendance = await db.attendance.create({
          data: {
            employeeId,
            date,
            punchIn: time,
            punchInLat: latitude || null,
            punchInLng: longitude || null,
            punchInPhoto: photo || null,
            workHours: 0,
            overtime: 0,
            status: 'present',
          },
        });
        console.log('Created attendance record:', attendance.id);
        return NextResponse.json({
          success: true,
          attendance,
          time: shortTime, // For backward compatibility
          accurateTime: displayTime, // Full time with seconds
          accuracy // Location accuracy in meters
        });
      }
    } else {
      // Punch out
      let existing = await db.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
      });

      if (!existing || !existing.punchIn) {
        const openRecords = await db.attendance.findMany({
          where: { employeeId },
          orderBy: [
            { date: 'desc' },
            { punchIn: 'desc' },
          ],
        });
        existing = openRecords.find((record) => record.punchIn && !record.punchOut) || existing;
      }

      if (!existing || !existing.punchIn) {
        console.log('Not punched in yet');
        return NextResponse.json({ error: 'Not punched in yet' }, { status: 400 });
      }

      if (existing.punchOut) {
        console.log('Already punched out:', existing.punchOut);
        return NextResponse.json({ error: 'Already punched out' }, { status: 400 });
      }

      const workSeconds = workSecondsBetween(existing.date, existing.punchIn, date, time);
      if (workSeconds == null) {
        console.error('Invalid time format:', { punchIn: existing.punchIn, punchOut: time });
        return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
      }

      if (workSeconds < 0) {
        console.error('Punch out time is before punch in time');
        return NextResponse.json({ error: 'Punch out time cannot be before punch in time' }, { status: 400 });
      }

      const workHours = Math.round((workSeconds / 3600) * 100) / 100;

      // Calculate overtime (more accurate with seconds)
      const overtime = Math.max(0, workHours - 8);

      const attendance = await db.attendance.update({
        where: { id: existing.id },
        data: {
          punchOut: time,
          punchOutLat: latitude || null,
          punchOutLng: longitude || null,
          punchOutPhoto: photo || null,
          workHours,
          overtime,
        },
      });
      console.log('Updated attendance with punch out:', attendance.id);

      return NextResponse.json({
        success: true,
        attendance,
        time: shortTime, // For backward compatibility
        accurateTime: displayTime, // Full time with seconds
        workHours,
        overtime,
        accuracy // Location accuracy in meters
      });
    }
  } catch (error) {
    console.error('Error recording attendance:', error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
