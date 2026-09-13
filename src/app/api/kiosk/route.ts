import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { dateTo24HourFormatWithSeconds } from '@/lib/time-utils';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

function getLocalDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// POST /api/kiosk - Fast attendance clock in/out via Kiosk with PIN or User ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, identifier, pin, photo } = body;

    if (!organizationId || !identifier) {
      return noStoreJson({ error: 'Organization ID and Employee Phone/User ID are required' }, { status: 400 });
    }

    const cleanId = String(identifier).trim();
    const employee = await db.employee.findFirst({
      where: {
        organizationId,
        OR: [
          { phone: cleanId },
          { userId: cleanId.toLowerCase() },
        ],
      },
    });

    if (!employee) {
      return noStoreJson({ error: 'Employee not found in this organization' }, { status: 404 });
    }

    if (!employee.active) {
      return noStoreJson({ error: 'Employee account is inactive. Please contact admin.' }, { status: 403 });
    }

    // Verify PIN if provided or stored
    if (pin && employee.pin) {
      const pinMatches = await bcrypt.compare(String(pin), employee.pin);
      if (!pinMatches) {
        return noStoreJson({ error: 'Invalid 4-digit PIN' }, { status: 401 });
      }
    } else if (pin && !employee.pin) {
      // If PIN is provided but not hashed in DB yet, check if matches last 4 digits of phone or password
      const fallbackMatches = pin === employee.phone.slice(-4) || (await bcrypt.compare(String(pin), employee.password));
      if (!fallbackMatches) {
        return noStoreJson({ error: 'Invalid PIN' }, { status: 401 });
      }
    }

    const now = new Date();
    const todayDate = getLocalDateKey();
    const timeStr = dateTo24HourFormatWithSeconds(now);

    const existingAttendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
    });

    // 1. PUNCH IN
    if (!existingAttendance || !existingAttendance.punchIn) {
      const attendance = await db.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayDate,
          },
        },
        create: {
          employeeId: employee.id,
          date: todayDate,
          punchIn: timeStr,
          punchInPhoto: photo || null,
          status: 'present',
          workHours: 0,
          overtime: 0,
        },
        update: {
          punchIn: timeStr,
          punchInPhoto: photo || null,
          status: 'present',
        },
      });

      return noStoreJson({
        success: true,
        action: 'in',
        message: `Welcome, ${employee.name}! Punched In at ${timeStr}`,
        employeeName: employee.name,
        time: timeStr,
        attendance,
      });
    }

    // 2. ALREADY COMPLETED (PUNCHED OUT)
    if (existingAttendance.punchOut) {
      return noStoreJson({
        success: true,
        action: 'completed',
        alreadyRecorded: true,
        message: `Attendance already completed for today (${existingAttendance.workHours}h).`,
        employeeName: employee.name,
        time: existingAttendance.punchOut,
      });
    }

    // 3. PUNCH OUT
    let workHours = 0;
    try {
      const inParts = existingAttendance.punchIn.split(':').map(Number);
      const outParts = timeStr.split(':').map(Number);
      const inSec = inParts[0] * 3600 + inParts[1] * 60 + (inParts[2] || 0);
      const outSec = outParts[0] * 3600 + outParts[1] * 60 + (outParts[2] || 0);
      let diffSec = outSec - inSec;
      if (diffSec < 0) diffSec += 86400;
      workHours = Math.round((diffSec / 3600) * 100) / 100;
    } catch {}

    const overtime = Math.max(0, Math.round((workHours - 8) * 100) / 100);

    const updated = await db.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        punchOut: timeStr,
        punchOutPhoto: photo || null,
        workHours,
        overtime,
        status: 'present',
      },
    });

    return noStoreJson({
      success: true,
      action: 'out',
      message: `Goodbye, ${employee.name}! Punched Out at ${timeStr} (Total: ${workHours}h)`,
      employeeName: employee.name,
      time: timeStr,
      workHours,
      overtime,
      attendance: updated,
    });
  } catch (error) {
    console.error('Error in kiosk attendance:', error);
    return noStoreJson({ error: 'Failed to process Kiosk attendance' }, { status: 500 });
  }
}
