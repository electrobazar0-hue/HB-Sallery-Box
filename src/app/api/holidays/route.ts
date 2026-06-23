import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Holidays with status filter (employees only see published/active)
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const year = request.nextUrl.searchParams.get('year');
    const status = request.nextUrl.searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Organization ID is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { organizationId };

    if (year) {
      where.date = { startsWith: year };
    }

    // If no status specified or status=all, return all. Otherwise filter.
    if (status && status !== 'all') {
      where.status = status;
    }

    const holidays = await db.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const totalHolidays = holidays.length;
    const activeHolidays = holidays.filter(h => h.status === 'active').length;
    const draftHolidays = holidays.filter(h => h.status === 'draft').length;
    const paidHolidays = holidays.filter(h => h.isPaid).length;
    const halfDayHolidays = holidays.filter(h => h.isHalfDay).length;
    const optionalHolidays = holidays.filter(h => h.isOptional).length;
    const compOffHolidays = holidays.filter(h => h.compensatoryOff).length;

    return NextResponse.json({
      success: true,
      holidays,
      stats: {
        totalHolidays,
        activeHolidays,
        draftHolidays,
        paidHolidays,
        halfDayHolidays,
        optionalHolidays,
        compOffHolidays,
      },
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

// POST - Create holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId, holidayName, date, holidayType, description,
      allowPunch, isHalfDay, isPaid, isOptional, compensatoryOff,
      isRecurring, recurringDay, status, createdBy,
    } = body;

    if (!organizationId || !holidayName || !date || !createdBy) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await db.holiday.findUnique({
      where: { organizationId_date: { organizationId, date } },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'A holiday already exists on this date' }, { status: 400 });
    }

    const holiday = await db.holiday.create({
      data: {
        organizationId, holidayName, date,
        holidayType: holidayType || 'company',
        description: description || null,
        allowPunch: allowPunch || false,
        isHalfDay: isHalfDay || false,
        isPaid: isPaid !== undefined ? isPaid : true,
        isOptional: isOptional || false,
        compensatoryOff: compensatoryOff || false,
        isRecurring: isRecurring || false,
        recurringDay: recurringDay || null,
        status: status || 'active',
        createdBy,
      },
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({ success: false, error: 'Failed to create holiday' }, { status: 500 });
  }
}

// PUT - Update holiday (including publish/draft toggle)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Holiday ID is required' }, { status: 400 });
    }

    const holiday = await db.holiday.update({
      where: { id },
      data: {
        holidayName: data.holidayName,
        date: data.date,
        holidayType: data.holidayType,
        description: data.description || null,
        allowPunch: data.allowPunch,
        isHalfDay: data.isHalfDay,
        isPaid: data.isPaid,
        isOptional: data.isOptional,
        compensatoryOff: data.compensatoryOff,
        isRecurring: data.isRecurring,
        recurringDay: data.recurringDay || null,
        status: data.status,
        syncSource: data.syncSource,
      },
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json({ success: false, error: 'Failed to update holiday' }, { status: 500 });
  }
}

// DELETE - Delete holiday
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Holiday ID is required' }, { status: 400 });
    }

    await db.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete holiday' }, { status: 500 });
  }
}

// PATCH - Bulk publish/draft/delete
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, action, holidayIds, year } = body;

    if (!organizationId || !action) {
      return NextResponse.json({ success: false, error: 'Organization ID and action required' }, { status: 400 });
    }

    let count = 0;

    if (action === 'publish-all' && year) {
      // Publish all draft holidays for a year
      count = await db.holiday.updateMany({
        where: { organizationId, date: { startsWith: String(year) }, status: 'draft' },
        data: { status: 'active' },
      }).then(r => r.count);
    } else if (action === 'draft-all' && year) {
      // Unpublish all active holidays for a year
      count = await db.holiday.updateMany({
        where: { organizationId, date: { startsWith: String(year) }, status: 'active' },
        data: { status: 'draft' },
      }).then(r => r.count);
    } else if (action === 'publish' && Array.isArray(holidayIds)) {
      // Publish specific holidays
      count = await db.holiday.updateMany({
        where: { id: { in: holidayIds } },
        data: { status: 'active' },
      }).then(r => r.count);
    } else if (action === 'draft' && Array.isArray(holidayIds)) {
      // Draft specific holidays
      count = await db.holiday.updateMany({
        where: { id: { in: holidayIds } },
        data: { status: 'draft' },
      }).then(r => r.count);
    } else if (action === 'delete-drafts' && year) {
      // Delete all draft holidays for a year
      count = await db.holiday.deleteMany({
        where: { organizationId, date: { startsWith: String(year) }, status: 'draft' },
      }).then(r => r.count);
    }

    return NextResponse.json({
      success: true,
      count,
      message: `${count} holidays ${action === 'publish-all' ? 'published' : action === 'draft-all' ? 'moved to draft' : action === 'publish' ? 'published' : action === 'draft' ? 'moved to draft' : 'deleted'}`,
    });
  } catch (error) {
    console.error('Bulk holiday action error:', error);
    return NextResponse.json({ success: false, error: 'Failed to perform bulk action' }, { status: 500 });
  }
}