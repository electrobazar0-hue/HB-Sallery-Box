import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dateTo24HourFormatWithSeconds } from '@/lib/time-utils';

export const dynamic = 'force-dynamic';

function getLocalDateKey(value?: unknown) {
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

function secondsFromTime(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  const isPM = /pm/i.test(trimmed);
  const isAM = /am/i.test(trimmed);
  const cleanStr = trimmed.replace(/[^\d:]/g, '');
  const parts = cleanStr.split(':').map(Number);

  if (parts.length < 2 || parts.some((p) => Number.isNaN(p))) return null;

  let hours = parts[0];
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 3600 + minutes * 60 + seconds;
}

function workSecondsBetween(startDate: string, startTime: string, endDate: string, endTime: string): number {
  const startSeconds = secondsFromTime(startTime) ?? 0;
  const endSeconds = secondsFromTime(endTime) ?? 0;

  let dayDifferenceSeconds = 0;
  try {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      dayDifferenceSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
    }
  } catch {}

  const totalSeconds = dayDifferenceSeconds + endSeconds - startSeconds;
  return Math.max(0, totalSeconds);
}

function calculateDistanceMeters(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
) {
  const earthRadiusMeters = 6371e3;
  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusMeters * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function parseCoordinate(value: unknown) {
  if (value == null || !String(value).trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const date = request.nextUrl.searchParams.get('date');
  const month = request.nextUrl.searchParams.get('month');

  try {
    const where: Record<string, unknown> = {};

    if (employeeId) {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, active: true },
      });

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found. Please log in again or ask admin to add this employee.' },
          { status: 404 },
        );
      }

      if (employee.active === false) {
        return NextResponse.json(
          { error: 'Employee is inactive. Please contact admin.' },
          { status: 403 },
        );
      }

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
      { success: true, attendance: result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/attendance - Punch in/out with LOCAL timestamp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId, type,
      latitude, longitude, photo,
      timestamp,
      localDate,
      localTime,
      accuracy,
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

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        active: true,
        geofenceEnabled: true,
        geofenceLat: true,
        geofenceLng: true,
        geofenceRadius: true,
      },
    });

    if (!employee) {
      console.error('Attendance attempted for missing employee:', employeeId);
      return NextResponse.json(
        { error: 'Employee not found. Please log in again or ask admin to add this employee.' },
        { status: 404 },
      );
    }

    if (employee.active === false) {
      console.error('Attendance attempted for inactive employee:', employeeId);
      return NextResponse.json(
        { error: 'Employee is inactive. Please contact admin.' },
        { status: 403 },
      );
    }

    // Use LOCAL timestamp from device
    const now = timestamp ? new Date(timestamp) : new Date();
    const date = getLocalDateKey(localDate) || getLocalDateKey(now);

    if (isNaN(now.getTime()) || !date) {
      console.error('Invalid timestamp:', timestamp);
      return NextResponse.json({ error: 'Invalid timestamp provided' }, { status: 400 });
    }

    const time = localTime || dateTo24HourFormatWithSeconds(now);
    const displayTime = time;
    const shortTime = time.slice(0, 5);

    if (employee.geofenceEnabled) {
      if (
        employee.geofenceLat != null &&
        employee.geofenceLng != null &&
        employee.geofenceRadius != null &&
        employee.geofenceRadius > 0
      ) {
        const currentLat = parseCoordinate(latitude);
        const currentLng = parseCoordinate(longitude);

        if (currentLat != null && currentLng != null) {
          const distanceMeters = calculateDistanceMeters(
            { lat: currentLat, lng: currentLng },
            { lat: employee.geofenceLat, lng: employee.geofenceLng },
          );

          const gpsAccuracy = Number(accuracy) || 0;
          const accuracyBuffer = Math.min(gpsAccuracy, 25);
          const effectiveRadius = employee.geofenceRadius + accuracyBuffer;

          if (distanceMeters > effectiveRadius) {
            const actionLabel = type === 'in' ? 'punch in' : 'punch out';
            return NextResponse.json(
              {
                error: `You are not in a valid area for ${actionLabel}. (Distance: ${Math.round(distanceMeters)}m, Allowed: ${employee.geofenceRadius}m)`,
                distanceMeters: Math.round(distanceMeters),
                allowedRadiusMeters: employee.geofenceRadius,
              },
              { status: 403 },
            );
          }
        }
      }
    }

    if (type === 'in') {
      // Check if already punched in
      const existing = await db.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
      });

      const openRecord = await db.attendance.findFirst({
        where: {
          employeeId,
          punchIn: { not: null },
          punchOut: null,
        },
        orderBy: [
          { date: 'desc' },
          { punchIn: 'desc' },
        ],
      });

      if (openRecord && openRecord.date !== date) {
        return NextResponse.json(
          { error: 'Please punch out from your open attendance before punching in again.' },
          { status: 400 },
        );
      }

      if (existing && existing.punchIn) {
        console.log('Already punched in for today:', existing.punchIn);
        if (existing.punchOut) {
          return NextResponse.json({
            success: true,
            alreadyRecorded: true,
            message: 'Attendance already completed for today. Next punch-in will be available after 12:01 AM.',
            attendance: existing,
            time: existing.punchOut,
            accurateTime: existing.punchOut,
            workHours: existing.workHours,
            overtime: existing.overtime,
          });
        }
        return NextResponse.json({
          success: true,
          alreadyRecorded: true,
          message: 'Already punched in for today.',
          attendance: existing,
          time: existing.punchIn,
          accurateTime: existing.punchIn,
          accuracy: accuracy || null,
        });
      }

      if (existing) {
        // Update existing record
        const attendance = await db.attendance.update({
          where: { id: existing.id },
          data: {
            punchIn: time,
            punchInLat: latitude || null,
            punchInLng: longitude || null,
            punchInPhoto: photo || null,
            status: 'present',
          },
        });
        console.log('Updated attendance record:', attendance.id);
        return NextResponse.json({
          success: true,
          attendance,
          time: shortTime,
          accurateTime: displayTime,
          accuracy,
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
          time: shortTime,
          accurateTime: displayTime,
          accuracy,
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
        const openRecord = await db.attendance.findFirst({
          where: {
            employeeId,
            punchIn: { not: null },
            punchOut: null,
          },
          orderBy: [
            { date: 'desc' },
            { punchIn: 'desc' },
          ],
        });
        if (openRecord) {
          existing = openRecord;
        }
      }

      if (!existing || !existing.punchIn) {
        console.log('Not punched in yet');
        return NextResponse.json({ error: 'Not punched in yet. Please punch in first.' }, { status: 400 });
      }

      if (existing.punchOut) {
        console.log('Already punched out:', existing.punchOut);
        return NextResponse.json({
          success: true,
          alreadyRecorded: true,
          message: 'Already punched out for today.',
          attendance: existing,
          time: existing.punchOut,
          accurateTime: existing.punchOut,
          workHours: existing.workHours,
          overtime: existing.overtime,
        });
      }

      const workSeconds = workSecondsBetween(existing.date, existing.punchIn, date, time);
      const workHours = Math.round((workSeconds / 3600) * 100) / 100;
      const overtime = Math.max(0, Math.round((workHours - 8) * 100) / 100);

      const attendance = await db.attendance.update({
        where: { id: existing.id },
        data: {
          punchOut: time,
          punchOutLat: latitude || null,
          punchOutLng: longitude || null,
          punchOutPhoto: photo || null,
          workHours,
          overtime,
          status: 'present',
        },
      });
      console.log('Updated attendance with punch out:', attendance.id, 'workHours:', workHours);

      return NextResponse.json({
        success: true,
        attendance,
        time: shortTime,
        accurateTime: displayTime,
        workHours,
        overtime,
        accuracy,
      });
    }
  } catch (error) {
    console.error('Attendance error:', error);
    return NextResponse.json({ error: 'Failed to process attendance' }, { status: 500 });
  }
}
