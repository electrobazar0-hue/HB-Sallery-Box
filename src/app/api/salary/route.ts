import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/salary - Get salary records
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const month = request.nextUrl.searchParams.get('month');
  const calculate = request.nextUrl.searchParams.get('calculate');

  // Calculate salary for employee/month
  if (calculate === 'true' && employeeId && month) {
    try {
      const calculation = await calculateEmployeeSalary(employeeId, month);
      return NextResponse.json({ success: true, calculation });
    } catch (error) {
      console.error('Error calculating salary:', error);
      return NextResponse.json({ error: 'Error calculating salary' }, { status: 500 });
    }
  }

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

    const salaries = await db.salaryRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
            salary: true,
            overtimeRate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ salaries });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/salary - Create/Update salary record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId, month, baseSalary, overtime, incentives, deductions, netSalary,
      autoCalculate
    } = body;

    if (!employeeId || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auto-calculate if requested
    if (autoCalculate) {
      const calculation = await calculateEmployeeSalary(employeeId, month);

      // Upsert salary record
      const salary = await db.salaryRecord.upsert({
        where: {
          employeeId_month: {
            employeeId,
            month,
          },
        },
        update: {
          baseSalary: calculation.baseSalary,
          overtime: calculation.overtime,
          incentives: calculation.incentives,
          deductions: calculation.deductions,
          netSalary: calculation.netSalary,
        },
        create: {
          employeeId,
          month,
          baseSalary: calculation.baseSalary,
          overtime: calculation.overtime,
          incentives: calculation.incentives,
          deductions: calculation.deductions,
          netSalary: calculation.netSalary,
          status: 'pending',
        },
      });

      return NextResponse.json({ success: true, salary, calculation });
    }

    // Manual entry - upsert
    const salary = await db.salaryRecord.upsert({
      where: {
        employeeId_month: {
          employeeId,
          month,
        },
      },
      update: {
        baseSalary: baseSalary || 0,
        overtime: overtime || 0,
        incentives: incentives || 0,
        deductions: deductions || 0,
        netSalary: netSalary || 0,
      },
      create: {
        employeeId,
        month,
        baseSalary: baseSalary || 0,
        overtime: overtime || 0,
        incentives: incentives || 0,
        deductions: deductions || 0,
        netSalary: netSalary || 0,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, salary });
  } catch (error) {
    console.error('Error creating salary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/salary - Mark as paid
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Salary ID is required' }, { status: 400 });
    }

    const salary = await db.salaryRecord.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, salary });
  } catch (error) {
    console.error('Error updating salary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate employee salary
async function calculateEmployeeSalary(employeeId: string, month: string) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const attendance = await db.attendance.findMany({
    where: {
      employeeId,
      date: { startsWith: month },
    },
  });

  const employeeIncentives = await db.employeeIncentive.findMany({
    where: {
      employeeId,
      month,
    },
  });

  const totalWorkHours = attendance.reduce((sum, record) => sum + (record.workHours || 0), 0);
  const totalOvertime = attendance.reduce((sum, record) => sum + (record.overtime || 0), 0);

  const baseSalary = employee.salary || 0;
  const overtimeRate = employee.overtimeRate || (baseSalary / 176);
  const overtimePay = totalOvertime * overtimeRate;
  const totalIncentives = employeeIncentives.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const deductions = 0;
  const netSalary = baseSalary + overtimePay + totalIncentives - deductions;

  return {
    baseSalary,
    overtime: overtimePay,
    overtimeHours: totalOvertime,
    totalWorkHours,
    incentives: totalIncentives,
    deductions,
    netSalary,
    workingDays: attendance.length,
  };
}
