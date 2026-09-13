import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

function normalizeGeofenceInput(
  enabledValue: unknown,
  latValue: unknown,
  lngValue: unknown,
  radiusValue: unknown,
) {
  const enabled = enabledValue === true || enabledValue === 'true';

  if (!enabled) {
    return {
      geofenceEnabled: false,
      geofenceLat: null,
      geofenceLng: null,
      geofenceRadius: null,
    };
  }

  const latText = latValue == null ? '' : String(latValue).trim();
  const lngText = lngValue == null ? '' : String(lngValue).trim();
  const radiusText = radiusValue == null ? '' : String(radiusValue).trim();
  const lat = Number(latText);
  const lng = Number(lngText);
  const radius = radiusText ? Number(radiusText) : 100;

  if (!latText || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: 'Valid geofence latitude is required when geofence is enabled.' };
  }
  if (!lngText || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: 'Valid geofence longitude is required when geofence is enabled.' };
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    return { error: 'Valid geofence radius is required when geofence is enabled.' };
  }

  return {
    geofenceEnabled: true,
    geofenceLat: lat,
    geofenceLng: lng,
    geofenceRadius: radius,
  };
}

// GET /api/employees - Get employees by admin, organization, or branch
export async function GET(request: NextRequest) {
  const adminId = request.nextUrl.searchParams.get('adminId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const branchId = request.nextUrl.searchParams.get('branchId');
  const phone = request.nextUrl.searchParams.get('phone');
  const userId = request.nextUrl.searchParams.get('userId');
  const employeeId = request.nextUrl.searchParams.get('employeeId');

  // Check by phone number
  if (phone) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const employee = await db.employee.findUnique({
        where: { phone: cleanPhone },
        include: {
          organization: true,
          branch: true,
          shifts: {
            include: { shift: true },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      return noStoreJson({
        exists: true,
        employee: {
          id: employee.id,
          userId: employee.userId,
          name: employee.name,
          phone: employee.phone,
          email: employee.email,
          designation: employee.designation,
          department: employee.department,
          salary: employee.salary,
          organizationId: employee.organizationId,
          organizationName: employee.organization?.name || null,
          organizationLogo: employee.organization?.logo || null,
          branchId: employee.branchId,
          branchName: employee.branch?.name || 'Main Branch',
          profilePhoto: employee.profilePhoto,
          active: employee.active,
          geofenceEnabled: employee.geofenceEnabled,
          geofenceLat: employee.geofenceLat,
          geofenceLng: employee.geofenceLng,
          geofenceRadius: employee.geofenceRadius,
        },
      });
    } catch (error) {
      console.error('Error fetching employee by phone:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Check by userId
  if (userId) {
    try {
      const cleanUserId = userId.trim().toLowerCase();
      const employee = await db.employee.findUnique({
        where: { userId: cleanUserId },
        include: {
          organization: true,
          branch: true,
          shifts: {
            include: { shift: true },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      return noStoreJson({
        exists: true,
        employee: {
          id: employee.id,
          userId: employee.userId,
          name: employee.name,
          phone: employee.phone,
          email: employee.email,
          designation: employee.designation,
          department: employee.department,
          salary: employee.salary,
          organizationId: employee.organizationId,
          organizationName: employee.organization?.name || null,
          organizationLogo: employee.organization?.logo || null,
          branchId: employee.branchId,
          branchName: employee.branch?.name || 'Main Branch',
          profilePhoto: employee.profilePhoto,
          active: employee.active,
          geofenceEnabled: employee.geofenceEnabled,
          geofenceLat: employee.geofenceLat,
          geofenceLng: employee.geofenceLng,
          geofenceRadius: employee.geofenceRadius,
        },
      });
    } catch (error) {
      console.error('Error fetching employee by userId:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Get single employee by ID
  if (employeeId) {
    try {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: {
          organization: true,
          branch: true,
          shifts: {
            include: { shift: true },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      return noStoreJson({ employee });
    } catch (error) {
      console.error('Error fetching employee:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  if (!adminId && !organizationId) {
    return NextResponse.json({ error: 'Admin ID, Organization ID, Phone, User ID, or Employee ID is required' }, { status: 400 });
  }

  try {
    const where: Record<string, unknown> = {};
    if (adminId) where.adminId = adminId;
    if (organizationId) where.organizationId = organizationId;
    if (branchId) where.branchId = branchId;

    const employees = await db.employee.findMany({
      where,
      include: {
        branch: {
          select: { id: true, name: true, address: true },
        },
        shifts: {
          include: { shift: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return noStoreJson({ success: true, employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      password,
      securityPassword,
      pin,
      name,
      phone,
      email,
      address,
      designation,
      department,
      salary,
      overtimeRate,
      adminId,
      organizationId,
      branchId,
      salaryTemplateId,
      profilePhoto,
      shiftIds,
      aadharNumber, panNumber, accountNumber, ifscCode, upiId,
      geofenceEnabled, geofenceLat, geofenceLng, geofenceRadius,
    } = body;

    // Validate required fields
    if (!userId || userId.trim().length < 4) {
      return NextResponse.json({ error: 'User ID is required (minimum 4 characters)' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password is required (minimum 6 characters)' }, { status: 400 });
    }
    if (!securityPassword || securityPassword.length < 4) {
      return NextResponse.json({ error: 'Security Password is required (minimum 4 characters)' }, { status: 400 });
    }
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required (10 digits)' }, { status: 400 });
    }
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const cleanUserId = userId.trim().toLowerCase();

    const existingByUserId = await db.employee.findUnique({
      where: { userId: cleanUserId },
    });
    if (existingByUserId) {
      return NextResponse.json({ error: 'User ID already exists. Please choose a different one.' }, { status: 400 });
    }

    const existingByPhone = await db.employee.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingByPhone) {
      return NextResponse.json({ error: 'Phone number already registered with another employee.' }, { status: 400 });
    }

    const adminExists = await db.admin.findUnique({ where: { id: adminId } });
    if (!adminExists) {
      return NextResponse.json({ error: 'Admin not found. Please login again.' }, { status: 400 });
    }

    const orgExists = await db.organization.findUnique({ where: { id: organizationId } });
    if (!orgExists) {
      return NextResponse.json({ error: 'Organization not found. Please contact support.' }, { status: 400 });
    }

    const geofencePayload = normalizeGeofenceInput(
      geofenceEnabled,
      geofenceLat,
      geofenceLng,
      geofenceRadius,
    );
    if ('error' in geofencePayload) {
      return NextResponse.json({ error: geofencePayload.error }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityPassword = await bcrypt.hash(securityPassword, 10);
    const rawPin = pin ? String(pin).trim() : cleanPhone.slice(-4);
    const hashedPin = await bcrypt.hash(rawPin, 10);

    const employee = await db.employee.create({
      data: {
        userId: cleanUserId,
        password: hashedPassword,
        securityPassword: hashedSecurityPassword,
        pin: hashedPin,
        name: name.trim(),
        phone: cleanPhone,
        email: email?.trim() || null,
        address: address?.trim() || null,
        designation: designation?.trim() || null,
        department: department?.trim() || null,
        salary: Number(salary) || 0,
        overtimeRate: Number(overtimeRate) || 0,
        aadharNumber: aadharNumber?.trim() || null,
        panNumber: panNumber?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        ifscCode: ifscCode?.trim() || null,
        upiId: upiId?.trim() || null,
        adminId,
        organizationId,
        branchId: branchId || null,
        salaryTemplateId: salaryTemplateId || null,
        profilePhoto: profilePhoto || null,
        biometricEnabled: false,
        active: true,
        starOfMonth: false,
        ...geofencePayload,
        shifts: shiftIds && shiftIds.length > 0 ? {
          create: shiftIds.map((shiftId: string) => ({ shiftId })),
        } : undefined,
      },
      include: {
        branch: true,
        shifts: {
          include: { shift: true },
        },
      },
    });

    return noStoreJson({ success: true, employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: `Failed to create employee: ${errorMessage}` }, { status: 500 });
  }
}

// PUT /api/employees - Update employee & Reset PIN
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, pin, shiftIds, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      designation: data.designation,
      department: data.department,
      salary: data.salary,
      overtimeRate: data.overtimeRate,
      aadharNumber: data.aadharNumber,
      panNumber: data.panNumber,
      accountNumber: data.accountNumber,
      ifscCode: data.ifscCode,
      upiId: data.upiId,
      branchId: data.branchId !== undefined ? data.branchId : undefined,
      salaryTemplateId: data.salaryTemplateId !== undefined ? data.salaryTemplateId : undefined,
      biometricEnabled: data.biometricEnabled,
      active: data.active,
      starOfMonth: data.starOfMonth,
      profilePhoto: data.profilePhoto,
    };

    const geofencePatchProvided =
      data.geofenceEnabled !== undefined ||
      data.geofenceLat !== undefined ||
      data.geofenceLng !== undefined ||
      data.geofenceRadius !== undefined;

    if (geofencePatchProvided) {
      const geofencePayload = normalizeGeofenceInput(
        data.geofenceEnabled,
        data.geofenceLat,
        data.geofenceLng,
        data.geofenceRadius,
      );
      if ('error' in geofencePayload) {
        return NextResponse.json({ error: geofencePayload.error }, { status: 400 });
      }
      Object.assign(updateData, geofencePayload);
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (pin) {
      updateData.pin = await bcrypt.hash(String(pin).trim(), 10);
    }

    if (data.userId) {
      const existing = await db.employee.findUnique({
        where: { userId: data.userId },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'User ID already exists' }, { status: 400 });
      }
      updateData.userId = data.userId;
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
      include: {
        branch: true,
        shifts: {
          include: { shift: true },
        },
      },
    });

    if (shiftIds !== undefined) {
      await db.employeeShift.deleteMany({
        where: { employeeId: id },
      });
      if (shiftIds && shiftIds.length > 0) {
        await db.employeeShift.createMany({
          data: shiftIds.map((shiftId: string) => ({
            employeeId: id,
            shiftId,
          })),
        });
      }
    }

    return noStoreJson({ success: true, employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/employees - Delete / deactivate employee
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const hardDelete = request.nextUrl.searchParams.get('hard') === 'true';

  if (!id) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  try {
    if (hardDelete) {
      await db.employee.delete({ where: { id } });
      return noStoreJson({ success: true, message: 'Employee permanently deleted' });
    }

    // Default: Soft deactivate for data safety
    const updated = await db.employee.update({
      where: { id },
      data: { active: false },
    });
    return noStoreJson({ success: true, message: 'Employee deactivated successfully', employee: updated });
  } catch (error) {
    console.error('Error in delete employee route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
