import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password, role } = body;

    if (!userId || !password) {
      return NextResponse.json({
        success: false,
        error: 'User ID and Password are required',
      }, { status: 400 });
    }

    if (role === 'admin') {
      // Check admin credentials
      const admin = await db.admin.findUnique({
        where: { userId },
        include: { Organization: true },
      });

      if (!admin) {
        return NextResponse.json({
          success: false,
          error: 'Invalid User ID or Password',
        }, { status: 401 });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return NextResponse.json({
          success: false,
          error: 'Invalid User ID or Password',
        }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: admin.id,
          userId: admin.userId,
          name: admin.name,
          phone: admin.phone,
          email: admin.email,
          role: 'admin',
          organizationId: admin.Organization?.id || null,
          organizationName: admin.Organization?.name || null,
          profilePhoto: admin.profilePhoto,
        },
      });
    } else {
      // Check employee credentials
      const employee = await db.employee.findUnique({
        where: { userId },
        include: { Organization: true },
      });

      if (!employee) {
        return NextResponse.json({
          success: false,
          error: 'Invalid User ID or Password',
        }, { status: 401 });
      }

      if (!employee.active) {
        return NextResponse.json({
          success: false,
          error: 'Your account is inactive. Please contact your admin.',
        }, { status: 403 });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, employee.password);

      if (!isValidPassword) {
        return NextResponse.json({
          success: false,
          error: 'Invalid User ID or Password',
        }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: employee.id,
          userId: employee.userId,
          name: employee.name,
          phone: employee.phone,
          email: employee.email,
          role: 'employee',
          designation: employee.designation,
          department: employee.department,
          salary: employee.salary,
          organizationId: employee.organizationId,
          organizationName: employee.Organization?.name || null,
          profilePhoto: employee.profilePhoto,
          geofenceEnabled: employee.geofenceEnabled,
          geofenceLat: employee.geofenceLat,
          geofenceLng: employee.geofenceLng,
          geofenceRadius: employee.geofenceRadius,
        },
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Login failed. Please try again.',
    }, { status: 500 });
  }
}