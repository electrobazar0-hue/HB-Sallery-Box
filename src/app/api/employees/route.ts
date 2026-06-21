import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/employees - Get employees by admin or check by phone/userId
export async function GET(request: NextRequest) {
  const adminId = request.nextUrl.searchParams.get('adminId');
  const organizationId = request.nextUrl.searchParams.get('organizationId');
  const phone = request.nextUrl.searchParams.get('phone');
  const userId = request.nextUrl.searchParams.get('userId');
  const employeeId = request.nextUrl.searchParams.get('employeeId');

  // Check if employee exists by phone
  if (phone) {
    try {
      const employee = await db.employee.findUnique({
        where: { phone },
        include: {
          organization: true,
          shifts: {
            include: { shift: true },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ exists: false });
      }

      return NextResponse.json({
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
          overtimeRate: employee.overtimeRate,
          organizationId: employee.organizationId,
          organizationName: employee.organization?.name || null,
          profilePhoto: employee.profilePhoto,
          active: employee.active,
          shifts: employee.shifts,
        },
      });
    } catch (error) {
      console.error('Error fetching employee by phone:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Check if employee exists by userId
  if (userId) {
    try {
      const employee = await db.employee.findUnique({
        where: { userId },
        include: { Organization: true },
      });

      if (!employee) {
        return NextResponse.json({ exists: false });
      }

      return NextResponse.json({
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
          profilePhoto: employee.profilePhoto,
          active: employee.active,
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
          shifts: {
            include: { shift: true },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      return NextResponse.json({ employee });
    } catch (error) {
      console.error('Error fetching employee:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  if (!adminId && !organizationId) {
    return NextResponse.json({ error: 'Admin ID, Organization ID, Phone, User ID, or Employee ID is required' }, { status: 400 });
  }

  try {
    const where = adminId ? { adminId } : (organizationId ? { organizationId } : {});
    
    const employees = await db.employee.findMany({
      where,
      include: {
        shifts: {
          include: { shift: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ employees });
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
      userId, password, securityPassword,
      name, phone, email, address, designation, department, 
      salary, overtimeRate, adminId, organizationId, profilePhoto,
      shiftIds,
      aadharNumber, panNumber, accountNumber, ifscCode, upiId,
      geofenceEnabled, geofenceLat, geofenceLng, geofenceRadius,
    } = body;

    // Validate required fields with detailed error messages
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

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanUserId = userId.trim().toLowerCase();

    // Check if userId already exists
    const existingByUserId = await db.employee.findUnique({
      where: { userId: cleanUserId },
    });
    if (existingByUserId) {
      return NextResponse.json({ error: 'User ID already exists. Please choose a different one.' }, { status: 400 });
    }

    // Check if phone already exists
    const existingByPhone = await db.employee.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingByPhone) {
      return NextResponse.json({ error: 'Phone number already registered with another employee.' }, { status: 400 });
    }

    // Verify admin exists
    const adminExists = await db.admin.findUnique({
      where: { id: adminId },
    });
    if (!adminExists) {
      return NextResponse.json({ error: 'Admin not found. Please login again.' }, { status: 400 });
    }

    // Verify organization exists
    const orgExists = await db.organization.findUnique({
      where: { id: organizationId },
    });
    if (!orgExists) {
      return NextResponse.json({ error: 'Organization not found. Please contact support.' }, { status: 400 });
    }

    // Hash password and security password
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityPassword = await bcrypt.hash(securityPassword, 10);

    // Create employee with shifts
    const employee = await db.employee.create({
      data: {
        userId: cleanUserId,
        password: hashedPassword,
        securityPassword: hashedSecurityPassword,
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
        profilePhoto: profilePhoto || null,
        biometricEnabled: false,
        active: true,
        starOfMonth: false,
        geofenceEnabled: geofenceEnabled || false,
        geofenceLat: geofenceLat || null,
        geofenceLng: geofenceLng || null,
        geofenceRadius: geofenceRadius || 100,
        shifts: shiftIds && shiftIds.length > 0 ? {
          create: shiftIds.map((shiftId: string) => ({
            shiftId,
          })),
        } : undefined,
      },
      include: {
        shifts: {
          include: { shift: true },
        },
      },
    });

    console.log('Employee created successfully:', employee.id, employee.name);
    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: `Failed to create employee: ${errorMessage}` }, { status: 500 });
  }
}

// PUT /api/employees - Update employee
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, shiftIds, ...data } = body;

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
      biometricEnabled: data.biometricEnabled,
      active: data.active,
      starOfMonth: data.starOfMonth,
      profilePhoto: data.profilePhoto,
      geofenceEnabled: data.geofenceEnabled,
      geofenceLat: data.geofenceLat,
      geofenceLng: data.geofenceLng,
      geofenceRadius: data.geofenceRadius,
    };

    // If password is provided, hash and update
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // If userId is being updated, check for duplicates
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
        shifts: {
          include: { shift: true },
        },
      },
    });

    // Update shifts if provided
    if (shiftIds !== undefined) {
      // Delete existing shifts
      await db.employeeShift.deleteMany({
        where: { employeeId: id },
      });
      
      // Create new shifts
      if (shiftIds && shiftIds.length > 0) {
        await db.employeeShift.createMany({
          data: shiftIds.map((shiftId: string) => ({
            employeeId: id,
            shiftId,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/employees - Delete employee (DISABLED - Users cannot be deleted)
export async function DELETE(request: NextRequest) {
  try {
    // Deleting users is not allowed - return error
    return NextResponse.json(
      { error: 'User deletion is not allowed. You can only deactivate users.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error in delete route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
