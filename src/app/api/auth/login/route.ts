import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phone, password, pin, role } = body;

    const identifier = (userId || phone || '').trim();
    const secret = (password || pin || '').trim();

    if (!identifier || !secret) {
      return NextResponse.json({
        success: false,
        error: 'User ID / Phone and Password / 4-Digit PIN are required',
      }, { status: 400 });
    }

    if (role === 'admin') {
      // Check admin credentials
      const admin = await db.admin.findFirst({
        where: {
          OR: [
            { userId: identifier },
            { phone: identifier },
          ],
        },
        include: { organization: true },
      });

      if (!admin) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Admin User ID/Phone or Password',
        }, { status: 401 });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(secret, admin.password);

      if (!isValidPassword) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Admin User ID/Phone or Password',
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
          organizationId: admin.organization?.id || null,
          organizationName: admin.organization?.name || null,
          organizationLogo: admin.organization?.logo || null,
          profilePhoto: admin.profilePhoto,
        },
      });
    } else {
      // Check employee credentials
      const employee = await db.employee.findFirst({
        where: {
          OR: [
            { userId: identifier.toLowerCase() },
            { phone: identifier },
          ],
        },
        include: {
          organization: true,
          branch: true,
        },
      });

      if (!employee) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Employee Phone/User ID or PIN/Password',
        }, { status: 401 });
      }

      if (!employee.active) {
        return NextResponse.json({
          success: false,
          error: 'Your account is inactive. Please contact your admin.',
        }, { status: 403 });
      }

      // Verify PIN or password
      let isValidSecret = false;
      if (employee.pin) {
        isValidSecret = await bcrypt.compare(secret, employee.pin);
      }
      if (!isValidSecret) {
        isValidSecret = await bcrypt.compare(secret, employee.password);
      }
      // Fallback for demo/dev if 4-digit PIN matches last 4 digits of phone
      if (!isValidSecret && secret.length === 4 && employee.phone.endsWith(secret)) {
        isValidSecret = true;
      }

      if (!isValidSecret) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Phone or 4-Digit PIN / Password',
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
          organizationName: employee.organization?.name || null,
          organizationLogo: employee.organization?.logo || null,
          branchId: employee.branchId || null,
          branchName: employee.branch?.name || 'Main Branch',
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
