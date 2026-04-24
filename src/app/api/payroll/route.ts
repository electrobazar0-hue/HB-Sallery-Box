import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a fresh Prisma client instance to avoid caching issues
const prisma = new PrismaClient();

// GET /api/payroll - Get payroll adjustments
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const month = request.nextUrl.searchParams.get('month');
  const status = request.nextUrl.searchParams.get('status');

  try {
    let where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (organizationId) {
      where.employee = { organizationId };
    }

    if (month) {
      where.month = month;
    }

    if (status) {
      where.status = status;
    }

    const payroll = await prisma.payrollAdjustment.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
            salary: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { month: 'desc' },
    });

    return NextResponse.json({ payroll });
  } catch (error) {
    console.error('Error fetching payroll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payroll - Create or update payroll adjustment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      month,
      baseSalary,
      bonus,
      deductions,
      advance,
      advanceRecovery,
      notes,
      createdBy,
    } = body;

    if (!employeeId || !month || !createdBy) {
      return NextResponse.json({
        error: 'Employee ID, month, and createdBy are required'
      }, { status: 400 });
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Calculate net salary
    const base = Number(baseSalary) || employee.salary || 0;
    const bonusAmount = Number(bonus) || 0;
    const deductionAmount = Number(deductions) || 0;
    const advanceAmount = Number(advance) || 0;
    const recoveryAmount = Number(advanceRecovery) || 0;
    
    const netSalary = base + bonusAmount + recoveryAmount - deductionAmount - advanceAmount;

    // Upsert payroll adjustment
    const payroll = await prisma.payrollAdjustment.upsert({
      where: {
        employeeId_month: {
          employeeId,
          month,
        },
      },
      update: {
        baseSalary: base,
        bonus: bonusAmount,
        deductions: deductionAmount,
        advance: advanceAmount,
        advanceRecovery: recoveryAmount,
        netSalary,
        notes: notes || null,
      },
      create: {
        employeeId,
        month,
        baseSalary: base,
        bonus: bonusAmount,
        deductions: deductionAmount,
        advance: advanceAmount,
        advanceRecovery: recoveryAmount,
        netSalary,
        notes: notes || null,
        createdBy,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
            salary: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, payroll });
  } catch (error) {
    console.error('Error creating payroll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payroll - Mark as paid
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const payroll = await prisma.payrollAdjustment.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({ success: true, payroll });
  } catch (error) {
    console.error('Error updating payroll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/payroll - Delete payroll adjustment
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 });
    }

    await prisma.payrollAdjustment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payroll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
