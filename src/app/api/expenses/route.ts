import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/expenses - Get expenses
export async function GET(request: NextRequest) {
  const employeeId = request.nextUrl.searchParams.get('employeeId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const status = request.nextUrl.searchParams.get('status');
  const category = request.nextUrl.searchParams.get('category');
  const month = request.nextUrl.searchParams.get('month');

  try {
    let where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (organizationId) {
      where.employee = { organizationId };
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    // Filter by month (based on expenseDate)
    if (month) {
      where.expenseDate = { startsWith: month };
    }

    const expenses = await db.expense.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      title,
      description,
      category,
      amount,
      currency,
      expenseDate,
      receiptUrl,
    } = body;

    if (!employeeId || !title || !category || !amount || !expenseDate) {
      return NextResponse.json({
        error: 'Employee ID, title, category, amount, and expense date are required'
      }, { status: 400 });
    }

    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const expense = await db.expense.create({
      data: {
        employeeId,
        title,
        description: description || null,
        category,
        amount: Number(amount),
        currency: currency || 'INR',
        expenseDate,
        receiptUrl: receiptUrl || null,
        status: 'pending',
      },
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

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/expenses - Update expense (approve/reject/pay)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy, rejectionReason, paymentMethod, paymentReference } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Expense ID and status are required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'approved') {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason || null;
    } else if (status === 'paid') {
      updateData.paidAt = new Date();
      updateData.paymentMethod = paymentMethod || null;
      updateData.paymentReference = paymentReference || null;
    }

    const expense = await db.expense.update({
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

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/expenses - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Only allow deleting pending expenses
    const expense = await db.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (expense.status !== 'pending') {
      return NextResponse.json({
        error: 'Cannot delete expense that is not pending'
      }, { status: 400 });
    }

    await db.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
