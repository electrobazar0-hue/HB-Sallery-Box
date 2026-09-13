import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

// GET /api/branches - List branches for an organization
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const branchId = request.nextUrl.searchParams.get('branchId');

  try {
    if (branchId) {
      const branch = await db.branch.findUnique({
        where: { id: branchId },
        include: {
          _count: { select: { employees: true } },
        },
      });
      if (!branch) {
        return noStoreJson({ error: 'Branch not found' }, { status: 404 });
      }
      return noStoreJson({ branch });
    }

    if (!organizationId) {
      return noStoreJson({ error: 'Organization ID is required' }, { status: 400 });
    }

    const branches = await db.branch.findMany({
      where: { organizationId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return noStoreJson({ success: true, branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return noStoreJson({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

// POST /api/branches - Create a new branch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, name, address, latitude, longitude, geofenceRadius } = body;

    if (!organizationId || !name || !address) {
      return noStoreJson({ error: 'Organization ID, Branch Name, and Address are required' }, { status: 400 });
    }

    const radius = Number(geofenceRadius) > 0 ? Number(geofenceRadius) : 150;
    const lat = latitude != null && latitude !== '' ? Number(latitude) : null;
    const lng = longitude != null && longitude !== '' ? Number(longitude) : null;

    const branch = await db.branch.create({
      data: {
        organizationId,
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        geofenceRadius: radius,
        active: true,
      },
    });

    return noStoreJson({ success: true, branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    return noStoreJson({ error: 'Failed to create branch' }, { status: 500 });
  }
}

// PUT /api/branches - Update branch
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, address, latitude, longitude, geofenceRadius, active } = body;

    if (!id) {
      return noStoreJson({ error: 'Branch ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = String(name).trim();
    if (address) updateData.address = String(address).trim();
    if (latitude !== undefined) updateData.latitude = latitude != null && latitude !== '' ? Number(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude != null && longitude !== '' ? Number(longitude) : null;
    if (geofenceRadius !== undefined) updateData.geofenceRadius = Number(geofenceRadius) || 150;
    if (active !== undefined) updateData.active = Boolean(active);

    const branch = await db.branch.update({
      where: { id },
      data: updateData,
    });

    return noStoreJson({ success: true, branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    return noStoreJson({ error: 'Failed to update branch' }, { status: 500 });
  }
}

// DELETE /api/branches - Delete branch
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return noStoreJson({ error: 'Branch ID is required' }, { status: 400 });
  }

  try {
    // Unassign employees before deleting
    await db.employee.updateMany({
      where: { branchId: id },
      data: { branchId: null },
    });

    await db.branch.delete({
      where: { id },
    });

    return noStoreJson({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return noStoreJson({ error: 'Failed to delete branch' }, { status: 500 });
  }
}
