import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, securityPassword, newPassword, role } = body;

    // Validate required fields
    if (!phone || !securityPassword || !newPassword || !role) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required',
      }, { status: 400 });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'New password must be at least 6 characters',
      }, { status: 400 });
    }

    // Find user by phone and role
    if (role === 'admin') {
      const admin = await db.admin.findUnique({
        where: { phone },
      });

      if (!admin) {
        return NextResponse.json({
          success: false,
          error: 'User not found with this phone number',
        }, { status: 404 });
      }

      // Verify security password
      const isValidSecurityPassword = await bcrypt.compare(securityPassword, admin.securityPassword);
      if (!isValidSecurityPassword) {
        return NextResponse.json({
          success: false,
          error: 'Invalid security password',
        }, { status: 401 });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
      });
    } else {
      const employee = await db.employee.findUnique({
        where: { phone },
      });

      if (!employee) {
        return NextResponse.json({
          success: false,
          error: 'User not found with this phone number',
        }, { status: 404 });
      }

      // Verify security password
      const isValidSecurityPassword = await bcrypt.compare(securityPassword, employee.securityPassword);
      if (!isValidSecurityPassword) {
        return NextResponse.json({
          success: false,
          error: 'Invalid security password',
        }, { status: 401 });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.employee.update({
        where: { id: employee.id },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
      });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset password. Please try again.',
    }, { status: 500 });
  }
}
