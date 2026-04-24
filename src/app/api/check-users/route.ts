import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/check-users - Check all users in database
export async function GET() {
  try {
    // Count organizations
    const orgCount = await db.organization.count();
    const orgs = await db.organization.findMany({
      select: { id: true, name: true, adminId: true, createdAt: true }
    });

    // Count admins
    const adminCount = await db.admin.count();
    const admins = await db.admin.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true
      }
    });

    // Count employees
    const employeeCount = await db.employee.count();
    const employees = await db.employee.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        email: true,
        designation: true,
        department: true,
        active: true,
        createdAt: true
      }
    });

    // Count other records
    const attendanceCount = await db.attendance.count();
    const leaveCount = await db.leave.count();
    const salaryCount = await db.salaryRecord.count();
    const expenseCount = await db.expense.count();

    return NextResponse.json({
      summary: {
        organizations: orgCount,
        admins: adminCount,
        employees: employeeCount,
        attendanceRecords: attendanceCount,
        leaveRequests: leaveCount,
        salaryRecords: salaryCount,
        expenses: expenseCount,
      },
      organizations: orgs,
      admins: admins,
      employees: employees,
    });
  } catch (error) {
    console.error('Error checking users:', error);
    return NextResponse.json({ error: 'Failed to check users' }, { status: 500 });
  }
}
