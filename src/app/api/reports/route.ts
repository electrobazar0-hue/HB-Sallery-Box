import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

// GET /api/reports - Aggregated reports data for Attendance, Payroll, Leaves, Expenses
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const type = request.nextUrl.searchParams.get('type') || 'attendance'; // "attendance" | "payroll" | "leaves" | "expenses"
  const month = request.nextUrl.searchParams.get('month'); // YYYY-MM
  const branchId = request.nextUrl.searchParams.get('branchId');

  if (!organizationId) {
    return noStoreJson({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const employeeFilter: Record<string, unknown> = { organizationId };
    if (branchId) employeeFilter.branchId = branchId;

    // 1. ATTENDANCE REPORT
    if (type === 'attendance') {
      const whereClause: Record<string, unknown> = {
        employee: employeeFilter,
      };
      if (month) {
        whereClause.date = { startsWith: month };
      }

      const records = await db.attendance.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              phone: true,
              designation: true,
              department: true,
              branch: { select: { name: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { punchIn: 'desc' }],
      });

      return noStoreJson({
        success: true,
        type: 'attendance',
        count: records.length,
        records: records.map((r) => ({
          date: r.date,
          employeeName: r.employee?.name || 'Staff',
          phone: r.employee?.phone || '',
          designation: r.employee?.designation || '-',
          branch: r.employee?.branch?.name || 'Main Branch',
          punchIn: r.punchIn || '-',
          punchOut: r.punchOut || '-',
          workHours: r.workHours,
          overtime: r.overtime,
          status: r.status,
        })),
      });
    }

    // 2. PAYROLL / SALARY REPORT
    if (type === 'payroll') {
      const whereClause: Record<string, unknown> = {
        employee: employeeFilter,
      };
      if (month) {
        whereClause.month = month;
      }

      const records = await db.salaryRecord.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              phone: true,
              designation: true,
              salary: true,
              branch: { select: { name: true } },
            },
          },
        },
        orderBy: { month: 'desc' },
      });

      return noStoreJson({
        success: true,
        type: 'payroll',
        count: records.length,
        records: records.map((r) => ({
          month: r.month,
          employeeName: r.employee?.name || 'Staff',
          phone: r.employee?.phone || '',
          designation: r.employee?.designation || '-',
          branch: r.employee?.branch?.name || 'Main Branch',
          baseSalary: r.baseSalary,
          overtime: r.overtime,
          incentives: r.incentives,
          deductions: r.deductions,
          netSalary: r.netSalary,
          status: r.status,
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        })),
      });
    }

    // 3. LEAVE REPORT
    if (type === 'leaves') {
      const records = await db.leave.findMany({
        where: {
          employee: employeeFilter,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              phone: true,
              designation: true,
              branch: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return noStoreJson({
        success: true,
        type: 'leaves',
        count: records.length,
        records: records.map((r) => ({
          employeeName: r.employee?.name || 'Staff',
          phone: r.employee?.phone || '',
          branch: r.employee?.branch?.name || 'Main Branch',
          leaveType: r.type,
          startDate: r.startDate,
          endDate: r.endDate,
          reason: r.reason || '-',
          status: r.status,
          approvedBy: r.approvedBy || '-',
        })),
      });
    }

    // 4. EXPENSE REPORT
    if (type === 'expenses') {
      const records = await db.expense.findMany({
        where: {
          employee: employeeFilter,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              phone: true,
              branch: { select: { name: true } },
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
      });

      return noStoreJson({
        success: true,
        type: 'expenses',
        count: records.length,
        records: records.map((r) => ({
          employeeName: r.employee?.name || 'Staff',
          branch: r.employee?.branch?.name || 'Main Branch',
          title: r.title,
          category: r.category,
          amount: r.amount,
          date: r.expenseDate,
          status: r.status,
          rejectionReason: r.rejectionReason || null,
        })),
      });
    }

    return noStoreJson({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Error generating reports:', error);
    return noStoreJson({ error: 'Failed to generate report' }, { status: 500 });
  }
}
