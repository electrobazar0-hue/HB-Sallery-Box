import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/holidays - Get all holidays for an organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const year = request.nextUrl.searchParams.get('year');
    const status = request.nextUrl.searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID is required',
      }, { status: 400 });
    }

    const where: Record<string, unknown> = { organizationId };

    // Filter by year
    if (year) {
      where.date = { startsWith: year };
    }

    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }

    const holidays = await db.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Stats
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
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch holidays',
    }, { status: 500 });
  }
}

// POST /api/holidays - Create a new holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      holidayName,
      date,
      holidayType,
      description,
      allowPunch,
      isHalfDay,
      isPaid,
      isOptional,
      compensatoryOff,
      isRecurring,
      recurringDay,
      status,
      createdBy,
    } = body;

    if (!organizationId || !holidayName || !date || !createdBy) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    // Check if holiday already exists on this date
    const existing = await db.holiday.findUnique({
      where: {
        organizationId_date: {
          organizationId,
          date,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'A holiday already exists on this date',
      }, { status: 400 });
    }

    const holiday = await db.holiday.create({
      data: {
        organizationId,
        holidayName,
        date,
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

    return NextResponse.json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create holiday',
    }, { status: 500 });
  }
}

// PUT /api/holidays - Update a holiday
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Holiday ID is required',
      }, { status: 400 });
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
      },
    });

    return NextResponse.json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update holiday',
    }, { status: 500 });
  }
}

// DELETE /api/holidays - Delete a holiday
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Holiday ID is required',
      }, { status: 400 });
    }

    await db.holiday.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete holiday',
    }, { status: 500 });
  }
}
