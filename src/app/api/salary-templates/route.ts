import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

// GET /api/salary-templates - List templates for an organization
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return noStoreJson({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const templates = await db.salaryTemplate.findMany({
      where: { organizationId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return noStoreJson({ success: true, templates });
  } catch (error) {
    console.error('Error fetching salary templates:', error);
    return noStoreJson({ error: 'Failed to fetch salary templates' }, { status: 500 });
  }
}

// POST /api/salary-templates - Create salary template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      name,
      basicSalary = 0,
      hra = 0,
      conveyance = 0,
      allowances = 0,
      bonus = 0,
      pfDeduction = 0,
      tdsDeduction = 0,
      otherDeductions = 0,
    } = body;

    if (!organizationId || !name) {
      return noStoreJson({ error: 'Organization ID and Template Name are required' }, { status: 400 });
    }

    const earnings = Number(basicSalary) + Number(hra) + Number(conveyance) + Number(allowances) + Number(bonus);
    const deductions = Number(pfDeduction) + Number(tdsDeduction) + Number(otherDeductions);
    const netSalary = Math.max(0, earnings - deductions);

    const template = await db.salaryTemplate.create({
      data: {
        organizationId,
        name: name.trim(),
        basicSalary: Number(basicSalary) || 0,
        hra: Number(hra) || 0,
        conveyance: Number(conveyance) || 0,
        allowances: Number(allowances) || 0,
        bonus: Number(bonus) || 0,
        pfDeduction: Number(pfDeduction) || 0,
        tdsDeduction: Number(tdsDeduction) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        netSalary,
        active: true,
      },
    });

    return noStoreJson({ success: true, template });
  } catch (error) {
    console.error('Error creating salary template:', error);
    return noStoreJson({ error: 'Failed to create salary template' }, { status: 500 });
  }
}

// DELETE /api/salary-templates - Delete template
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return noStoreJson({ error: 'Template ID is required' }, { status: 400 });
  }

  try {
    await db.employee.updateMany({
      where: { salaryTemplateId: id },
      data: { salaryTemplateId: null },
    });

    await db.salaryTemplate.delete({ where: { id } });
    return noStoreJson({ success: true, message: 'Salary template deleted' });
  } catch (error) {
    console.error('Error deleting salary template:', error);
    return noStoreJson({ error: 'Failed to delete salary template' }, { status: 500 });
  }
}
