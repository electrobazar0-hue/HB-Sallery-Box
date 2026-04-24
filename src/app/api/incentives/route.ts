import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch incentives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    if (!organizationId && !employeeId) {
      return NextResponse.json({ error: 'Organization ID or Employee ID is required' }, { status: 400 });
    }

    let where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (organizationId) {
      where.employee = { organizationId };
    }

    if (month) {
      where.month = month;
    }

    const incentives = await db.employeeIncentive.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ incentives });
  } catch (error) {
    console.error('Error fetching incentives:', error);
    return NextResponse.json({ error: 'Failed to fetch incentives' }, { status: 500 });
  }
}

// POST - Create a new incentive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, amount, reason, type, month, notes, categoryId } = body;

    if (!employeeId || !amount || !reason || !month) {
      return NextResponse.json({ error: 'Employee ID, amount, reason, and month are required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const incentive = await db.employeeIncentive.create({
      data: {
        employeeId,
        amount: Number(amount),
        reason,
        type: type || 'bonus',
        month,
        notes: notes || null,
        categoryId: categoryId || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      incentive,
    });
  } catch (error) {
    console.error('Error creating incentive:', error);
    return NextResponse.json({ error: 'Failed to create incentive' }, { status: 500 });
  }
}

// DELETE - Delete an incentive
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Incentive ID is required' }, { status: 400 });
    }

    await db.employeeIncentive.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting incentive:', error);
    return NextResponse.json({ error: 'Failed to delete incentive' }, { status: 500 });
  }
}
