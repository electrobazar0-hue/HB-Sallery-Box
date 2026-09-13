import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

// GET /api/custom-fields - List custom fields
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return noStoreJson({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const fields = await db.customField.findMany({
      where: { organizationId },
      include: {
        _count: { select: { values: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return noStoreJson({ success: true, fields });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return noStoreJson({ error: 'Failed to fetch custom fields' }, { status: 500 });
  }
}

// POST /api/custom-fields - Create custom field
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, name, fieldType = 'text', options, required = false } = body;

    if (!organizationId || !name) {
      return noStoreJson({ error: 'Organization ID and Field Name are required' }, { status: 400 });
    }

    const field = await db.customField.create({
      data: {
        organizationId,
        name: name.trim(),
        fieldType: fieldType.toLowerCase(),
        options: options ? String(options) : null,
        required: Boolean(required),
      },
    });

    return noStoreJson({ success: true, field });
  } catch (error) {
    console.error('Error creating custom field:', error);
    return noStoreJson({ error: 'Failed to create custom field' }, { status: 500 });
  }
}

// DELETE /api/custom-fields - Delete custom field
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return noStoreJson({ error: 'Field ID is required' }, { status: 400 });
  }

  try {
    await db.customField.delete({ where: { id } });
    return noStoreJson({ success: true, message: 'Custom field deleted' });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return noStoreJson({ error: 'Failed to delete custom field' }, { status: 500 });
  }
}
