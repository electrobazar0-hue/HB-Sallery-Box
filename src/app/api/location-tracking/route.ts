import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

// GET /api/location-tracking - Get active tracking sessions for Admin Live Map
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const employeeId = request.nextUrl.searchParams.get('employeeId');

  try {
    const includeAll = request.nextUrl.searchParams.get('status') === 'all';
    const whereClause: Record<string, unknown> = {};
    if (!includeAll) {
      whereClause.status = 'active';
    }

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const sessions = await db.locationTrackingSession.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
            designation: true,
            department: true,
            profilePhoto: true,
            branch: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        attendance: {
          select: {
            id: true,
            date: true,
            punchIn: true,
            punchOut: true,
          },
        },
        updates: {
          orderBy: { timestamp: 'asc' },
          take: 150, // Get the breadcrumb path for route mapping
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const activeStaff = sessions.map((session) => {
      const updates = session.updates || [];
      const latestUpdate = updates[updates.length - 1] || null;
      
      const routeHistory = updates.map((u) => ({
        id: u.id,
        latitude: u.latitude,
        longitude: u.longitude,
        accuracy: u.accuracy,
        timestamp: u.timestamp,
      }));

      return {
        sessionId: session.id,
        employeeId: session.employeeId,
        status: session.status,
        name: session.employee?.name || 'Staff',
        phone: session.employee?.phone || '',
        designation: session.employee?.designation || '',
        department: session.employee?.department || '',
        profilePhoto: session.employee?.profilePhoto || null,
        branchName: session.employee?.branch?.name || 'Main Branch',
        punchInTime: session.attendance?.punchIn || null,
        punchOutTime: session.attendance?.punchOut || null,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        latitude: latestUpdate?.latitude ?? null,
        longitude: latestUpdate?.longitude ?? null,
        accuracy: latestUpdate?.accuracy ?? null,
        lastUpdated: latestUpdate?.timestamp ?? session.startedAt,
        totalPoints: routeHistory.length,
        routeHistory,
      };
    });

    return noStoreJson({ success: true, count: activeStaff.length, activeStaff });
  } catch (error) {
    console.error('Error fetching live tracking sessions:', error);
    return noStoreJson({ error: 'Failed to fetch tracking sessions' }, { status: 500 });
  }
}

// POST /api/location-tracking - Start session or push breadcrumb update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, employeeId, organizationId, attendanceId, latitude, longitude, accuracy } = body;

    if (!employeeId) {
      return noStoreJson({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Action 1: START active tracking session
    if (action === 'start') {
      const orgId = organizationId || (
        await db.employee.findUnique({ where: { id: employeeId }, select: { organizationId: true } })
      )?.organizationId;

      if (!orgId) {
        return noStoreJson({ error: 'Organization ID not found for employee' }, { status: 400 });
      }

      // Close any previously hanging active sessions for this employee
      await db.locationTrackingSession.updateMany({
        where: { employeeId, status: 'active' },
        data: { status: 'ended', endedAt: new Date() },
      });

      const session = await db.locationTrackingSession.create({
        data: {
          employeeId,
          organizationId: orgId,
          attendanceId: attendanceId || null,
          status: 'active',
          startedAt: new Date(),
        },
      });

      if (latitude != null && longitude != null) {
        await db.locationUpdate.create({
          data: {
            sessionId: session.id,
            latitude: Number(latitude),
            longitude: Number(longitude),
            accuracy: accuracy != null ? Number(accuracy) : null,
            timestamp: new Date(),
          },
        });
      }

      return noStoreJson({ success: true, message: 'Tracking session started', sessionId: session.id });
    }

    // Action 2: UPDATE breadcrumb location in active session
    if (action === 'update') {
      if (latitude == null || longitude == null) {
        return noStoreJson({ error: 'Latitude and Longitude are required for update' }, { status: 400 });
      }

      // Find active session for this employee
      const activeSession = await db.locationTrackingSession.findFirst({
        where: { employeeId, status: 'active' },
        orderBy: { startedAt: 'desc' },
      });

      if (!activeSession) {
        return noStoreJson({ error: 'No active tracking session found. Tracking is only active during on-duty attendance.' }, { status: 404 });
      }

      const update = await db.locationUpdate.create({
        data: {
          sessionId: activeSession.id,
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: accuracy != null ? Number(accuracy) : null,
          timestamp: new Date(),
        },
      });

      return noStoreJson({ success: true, updateId: update.id, timestamp: update.timestamp });
    }

    return noStoreJson({ error: 'Invalid action. Must be "start" or "update"' }, { status: 400 });
  } catch (error) {
    console.error('Error handling location tracking POST:', error);
    return noStoreJson({ error: 'Failed to process tracking request' }, { status: 500 });
  }
}

// PUT /api/location-tracking - Stop/end tracking session immediately on Punch Out
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, sessionId } = body;

    if (!employeeId && !sessionId) {
      return noStoreJson({ error: 'Employee ID or Session ID is required' }, { status: 400 });
    }

    const whereClause: Record<string, unknown> = { status: 'active' };
    if (sessionId) {
      whereClause.id = sessionId;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const result = await db.locationTrackingSession.updateMany({
      where: whereClause,
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    return noStoreJson({ success: true, message: 'Tracking session ended', count: result.count });
  } catch (error) {
    console.error('Error stopping tracking session:', error);
    return noStoreJson({ error: 'Failed to stop tracking session' }, { status: 500 });
  }
}
