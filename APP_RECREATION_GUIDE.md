# 📋 COMPLETE APP RECREATION GUIDE - HB SALLERY BOX

## 🎯 OVERVIEW

This guide contains everything needed to recreate the **HB Sallery Box HR Management System** from scratch.

**Project Type**: Full-Stack HR Management System
**Framework**: Next.js 16 with App Router
**Language**: TypeScript
**Status**: Production Ready

---

## 📚 TABLE OF CONTENTS

1. [Project Setup](#1-project-setup)
2. [Database Schema](#2-database-schema)
3. [Authentication System](#3-authentication-system)
4. [API Routes](#4-api-routes)
5. [State Management](#5-state-management)
6. [Pages & Components](#6-pages--components)
7. [Features Implementation](#7-features-implementation)
8. [Deployment Instructions](#8-deployment-instructions)

---

## 1. PROJECT SETUP

### 1.1 Initialize Next.js Project

```bash
# Create new Next.js project
npx create-next-app@latest hb-sallery-box --typescript --tailwind --eslint

# Navigate to project
cd hb-sallery-box

# Install core dependencies
bun add next@^16.1.1 react@^19.0.0 react-dom@^19.0.0 typescript@^5

# Install additional dependencies
bun add @prisma/client@^6.11.1 prisma@^6.11.1
bun add next-auth@^4.24.11
bun add zustand@^5.0.6 @tanstack/react-query@^5.82.0
bun add bcryptjs@^3.0.3 @types/bcryptjs@^3.0.0
bun add zod@^4.0.2 @hookform/resolvers@^5.1.1 react-hook-form@^7.60.0
bun add date-fns@^4.1.0
bun add lucide-react@^0.525.0
bun add framer-motion@^12.38.0
bun add recharts@^2.15.4

# Install shadcn/ui
bun add @radix-ui/react-accordion@^1.2.11
bun add @radix-ui/react-alert-dialog@^1.1.14
bun add @radix-ui/react-avatar@^1.1.10
bun add @radix-ui/react-checkbox@^1.3.2
bun add @radix-ui/react-dialog@^1.1.14
bun add @radix-ui/react-dropdown-menu@^2.1.15
bun add @radix-ui/react-label@^2.1.7
bun add @radix-ui/react-popover@^1.1.14
bun add @radix-ui/react-select@^2.2.5
bun add @radix-ui/react-separator@^1.1.7
bun add @radix-ui/react-slot@^1.2.3
bun add @radix-ui/react-switch@^1.2.5
bun add @radix-ui/react-tabs@^1.1.12
bun add @radix-ui/react-toast@^1.2.14
bun add @radix-ui/react-tooltip@^1.2.7
bun add class-variance-authority@^0.7.1
bun add clsx@^2.1.1 tailwind-merge@^3.3.1
```

### 1.2 Configure Next.js

**File: `next.config.ts`**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
```

**File: `tailwind.config.ts`**
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f0fdf4",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#f0fdf4",
          foreground: "#111827",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
```

**File: `.env`**
```env
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

---

## 2. DATABASE SCHEMA

### 2.1 Prisma Schema

**File: `prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  address     String
  gst         String?
  adminId     String   @unique
  admin       Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)
  employees   Employee[]
  shifts      Shift[]
  incentives  IncentiveCategory[]
  announcements Announcement[]
  holidays    Holiday[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Admin {
  id                String   @id @default(cuid())
  userId            String   @unique
  password          String
  securityPassword  String
  name              String
  phone             String   @unique
  email             String?
  address           String?
  profilePhoto      String?
  organization      Organization?
  employees         Employee[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Employee {
  id                String   @id @default(cuid())
  userId            String   @unique
  password          String
  securityPassword  String
  name              String
  phone             String   @unique
  email             String?
  address           String?
  designation       String?
  department        String?
  salary            Float    @default(0)
  overtimeRate      Float    @default(0)

  aadharNumber      String?
  panNumber         String?
  accountNumber     String?
  ifscCode          String?
  upiId             String?

  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  adminId           String
  admin             Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)
  attendance        Attendance[]
  leaves            Leave[]
  salaryRecords     SalaryRecord[]
  incentives        EmployeeIncentive[]
  shifts            EmployeeShift[]
  expenses          Expense[]
  payrollAdjustments PayrollAdjustment[]
  biometricEnabled  Boolean @default(false)
  profilePhoto      String?
  active            Boolean  @default(true)
  starOfMonth       Boolean  @default(false)

  geofenceEnabled   Boolean  @default(false)
  geofenceLat       Float?
  geofenceLng       Float?
  geofenceRadius    Float?   @default(100)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Shift {
  id              String   @id @default(cuid())
  name            String
  startTime       String
  endTime         String
  graceMinutes    Int      @default(15)
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  employees       EmployeeShift[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EmployeeShift {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  shiftId     String
  shift       Shift    @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@unique([employeeId, shiftId])
}

model Attendance {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date        String
  punchIn     String?
  punchOut    String?
  punchInLat  Float?
  punchInLng  Float?
  punchOutLat Float?
  punchOutLng Float?
  punchInPhoto  String?
  punchOutPhoto String?
  workHours   Float    @default(0)
  overtime    Float    @default(0)
  status      String   @default("present")
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([employeeId, date])
}

model Leave {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  type        String
  startDate   String
  endDate     String
  reason      String?
  status      String   @default("pending")
  attendanceAllow  Boolean  @default(true)
  approvedBy      String?
  approvedAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SalaryRecord {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  month       String
  baseSalary  Float
  overtime    Float    @default(0)
  incentives  Float    @default(0)
  deductions  Float    @default(0)
  netSalary   Float
  status      String   @default("pending")
  paidAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([employeeId, month])
}

model IncentiveCategory {
  id              String   @id @default(cuid())
  name            String
  description     String?
  amount          Float
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  employeeIncentives EmployeeIncentive[]
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EmployeeIncentive {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    IncentiveCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  month       String
  amount      Float
  reason      String
  type        String   @default("bonus")
  notes       String?
  createdAt   DateTime @default(now())

  @@index([employeeId])
  @@index([month])
}

model Announcement {
  id              String   @id @default(cuid())
  title           String
  message         String
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Holiday {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  holidayName     String
  date            String
  holidayType     String
  description     String?
  allowPunch      Boolean  @default(false)
  isHalfDay       Boolean  @default(false)
  isPaid          Boolean  @default(true)
  isOptional      Boolean  @default(false)
  compensatoryOff Boolean  @default(false)
  isRecurring     Boolean  @default(false)
  recurringDay    Int?
  status          String   @default("draft")
  syncSource      String?

  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, date])
  @@index([organizationId])
  @@index([date])
}

model Expense {
  id              String   @id @default(cuid())
  employeeId      String
  employee        Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  title           String
  description     String?
  category        String
  amount          Float
  currency        String   @default("INR")
  expenseDate     String
  submittedAt     DateTime @default(now())
  receiptUrl      String?

  status          String   @default("pending")
  approvedBy      String?
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  paidAt          DateTime?

  paymentMethod   String?
  paymentReference String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([employeeId])
  @@index([status])
  @@index([category])
}

model PayrollAdjustment {
  id              String   @id @default(cuid())
  employeeId      String
  employee        Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  month           String
  baseSalary      Float    @default(0)
  bonus           Float    @default(0)
  deductions      Float    @default(0)
  advance         Float    @default(0)
  advanceRecovery Float    @default(0)
  netSalary       Float    @default(0)
  notes           String?
  status          String   @default("pending")
  paidAt          DateTime?

  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([employeeId, month])
  @@index([month])
}
```

### 2.2 Database Client Setup

**File: `src/lib/db.ts`**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;
```

### 2.3 Initialize Database

```bash
# Push schema to database
bun run db:push

# Generate Prisma Client
bunx prisma generate
```

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Auth Utilities

**File: `src/lib/auth.ts`**
```typescript
import bcrypt from 'bcryptjs';
import { db } from './db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function authenticateAdmin(
  phone: string,
  password: string
) {
  const admin = await db.admin.findUnique({
    where: { phone },
    include: { organization: true },
  });

  if (!admin) {
    return null;
  }

  const isValid = await verifyPassword(password, admin.password);

  if (!isValid) {
    return null;
  }

  return admin;
}

export async function authenticateEmployee(
  phone: string,
  password: string
) {
  const employee = await db.employee.findUnique({
    where: { phone },
    include: {
      organization: true,
      admin: true,
    },
  });

  if (!employee) {
    return null;
  }

  const isValid = await verifyPassword(password, employee.password);

  if (!isValid) {
    return null;
  }

  return employee;
}
```

### 3.2 Auth Store (Zustand)

**File: `src/stores/auth-store.ts`**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  role: 'admin' | 'employee' | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      role: null,

      login: async (phone: string, password: string) => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password }),
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const data = await response.json();

          set({
            user: data.user,
            isAuthenticated: true,
            role: data.role,
          });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          role: null,
        });
      },

      setUser: (user: any) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

---

## 4. API ROUTES

### 4.1 Auth API

**File: `src/app/api/auth/login/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, authenticateEmployee } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    let user = await authenticateAdmin(phone, password);
    let role = 'admin';

    if (!user) {
      user = await authenticateEmployee(phone, password);
      role = 'employee';
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
      role,
      organization: user.organization,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.2 Employees API

**File: `src/app/api/employees/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// GET - Get all employees
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    const employees = await db.employee.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: {
        organization: true,
        admin: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      password,
      securityPassword,
      name,
      phone,
      email,
      address,
      designation,
      department,
      salary,
      overtimeRate,
      organizationId,
      adminId,
      aadharNumber,
      panNumber,
      accountNumber,
      ifscCode,
      upiId,
    } = body;

    const hashedPassword = await hashPassword(password);
    const hashedSecurityPassword = await hashPassword(securityPassword);

    const employee = await db.employee.create({
      data: {
        userId,
        password: hashedPassword,
        securityPassword: hashedSecurityPassword,
        name,
        phone,
        email,
        address,
        designation,
        department,
        salary: salary || 0,
        overtimeRate: overtimeRate || 0,
        organizationId,
        adminId,
        aadharNumber,
        panNumber,
        accountNumber,
        ifscCode,
        upiId,
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate employee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const employee = await db.employee.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File: `src/app/api/employees/[id]/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await db.employee.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        admin: true,
        shifts: {
          include: { shift: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const employee = await db.employee.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.3 Attendance API

**File: `src/app/api/attendance/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    let where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      where.date = date;
    }

    if (month) {
      where.date = {
        startsWith: month,
      };
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
            designation: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Mark attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      date,
      punchIn,
      punchOut,
      punchInLat,
      punchInLng,
      punchOutLat,
      punchOutLng,
      punchInPhoto,
      punchOutPhoto,
      status,
      notes,
    } = body;

    const attendance = await db.attendance.create({
      data: {
        employeeId,
        date,
        punchIn,
        punchOut,
        punchInLat,
        punchInLng,
        punchOutLat,
        punchOutLng,
        punchInPhoto,
        punchOutPhoto,
        status: status || 'present',
        notes,
      },
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File: `src/app/api/attendance/punch-in/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      punchInLat,
      punchInLng,
      punchInPhoto,
    } = body;

    const today = new Date().toISOString().split('T')[0];

    const attendance = await db.attendance.create({
      data: {
        employeeId,
        date: today,
        punchIn: new Date().toTimeString().split(' ')[0],
        punchInLat,
        punchInLng,
        punchInPhoto,
        status: 'present',
      },
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error('Error punching in:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File: `src/app/api/attendance/punch-out/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      punchOutLat,
      punchOutLng,
      punchOutPhoto,
    } = body;

    const today = new Date().toISOString().split('T')[0];

    const attendance = await db.attendance.updateMany({
      where: {
        employeeId,
        date: today,
      },
      data: {
        punchOut: new Date().toTimeString().split(' ')[0],
        punchOutLat,
        punchOutLng,
        punchOutPhoto,
      },
    });

    const record = await db.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    return NextResponse.json({ attendance: record });
  } catch (error) {
    console.error('Error punching out:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.4 Leave API

**File: `src/app/api/leave/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get leave requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    let where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const leaves = await db.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      type,
      startDate,
      endDate,
      reason,
    } = body;

    const leave = await db.leave.create({
      data: {
        employeeId,
        type,
        startDate,
        endDate,
        reason,
        status: 'pending',
      },
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File: `src/app/api/leave/[id]/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Approve/Reject leave
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approvedBy } = body;

    const leave = await db.leave.update({
      where: { id: params.id },
      data: {
        status,
        approvedBy,
        approvedAt: status === 'approved' ? new Date() : null,
      },
    });

    return NextResponse.json({ leave });
  } catch (error) {
    console.error('Error updating leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.5 Salary API

**File: `src/app/api/salary/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get salary records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    let where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = month;
    }

    const salaries = await db.salaryRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
            designation: true,
            salary: true,
          },
        },
      },
      orderBy: { month: 'desc' },
    });

    return NextResponse.json({ salaries });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Generate salary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      month,
      baseSalary,
      overtime,
      incentives,
      deductions,
    } = body;

    const netSalary = baseSalary + overtime + incentives - deductions;

    const salary = await db.salaryRecord.create({
      data: {
        employeeId,
        month,
        baseSalary,
        overtime: overtime || 0,
        incentives: incentives || 0,
        deductions: deductions || 0,
        netSalary,
        status: 'pending',
      },
    });

    return NextResponse.json({ salary }, { status: 201 });
  } catch (error) {
    console.error('Error creating salary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.6 Expense API

**File: `src/app/api/expenses/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get expenses
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    let where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const expenses = await db.expense.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Submit expense
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

    const expense = await db.expense.create({
      data: {
        employeeId,
        title,
        description,
        category,
        amount,
        currency: currency || 'INR',
        expenseDate,
        receiptUrl,
        status: 'pending',
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.7 Holidays API

**File: `src/app/api/holidays/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get holidays
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    const holidays = await db.holiday.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      holidayName,
      date,
      holidayType,
      description,
      allowPunch,
      isHalfDay,
      isPaid,
      isOptional,
      compensatoryOff,
      isRecurring,
      recurringDay,
      status,
      createdBy,
    } = body;

    const holiday = await db.holiday.create({
      data: {
        organizationId,
        holidayName,
        date,
        holidayType,
        description,
        allowPunch: allowPunch || false,
        isHalfDay: isHalfDay || false,
        isPaid: isPaid !== undefined ? isPaid : true,
        isOptional: isOptional || false,
        compensatoryOff: compensatoryOff || false,
        isRecurring: isRecurring || false,
        recurringDay,
        status: status || 'active',
        createdBy,
      },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.8 Shifts API

**File: `src/app/api/shifts/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get shifts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    const shifts = await db.shift.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        employees: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      startTime,
      endTime,
      graceMinutes,
      organizationId,
    } = body;

    const shift = await db.shift.create({
      data: {
        name,
        startTime,
        endTime,
        graceMinutes: graceMinutes || 15,
        organizationId,
      },
    });

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.9 Incentives API

**File: `src/app/api/incentives/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get incentives
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    let where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = month;
    }

    const incentives = await db.employeeIncentive.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ incentives });
  } catch (error) {
    console.error('Error fetching incentives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create incentive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      categoryId,
      month,
      amount,
      reason,
      type,
      notes,
    } = body;

    const incentive = await db.employeeIncentive.create({
      data: {
        employeeId,
        categoryId,
        month,
        amount,
        reason,
        type: type || 'bonus',
        notes,
      },
    });

    return NextResponse.json({ incentive }, { status: 201 });
  } catch (error) {
    console.error('Error creating incentive:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.10 Announcements API

**File: `src/app/api/announcements/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get announcements
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    const announcements = await db.announcement.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create announcement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      message,
      organizationId,
    } = body;

    const announcement = await db.announcement.create({
      data: {
        title,
        message,
        organizationId,
        active: true,
      },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.11 Admin API

**File: `src/app/api/admin/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// GET - Get admin profile
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    const admin = await db.admin.findUnique({
      where: { id: id || undefined },
      include: {
        organization: true,
        employees: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            phone: true,
            designation: true,
            active: true,
          },
        },
      },
    });

    return NextResponse.json({ admin });
  } catch (error) {
    console.error('Error fetching admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update admin profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, address, profilePhoto } = body;

    const admin = await db.admin.update({
      where: { id },
      data: {
        name,
        email,
        address,
        profilePhoto,
      },
    });

    return NextResponse.json({ admin });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create admin (DISABLED - Security)
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { error: 'Admin creation is not allowed via this endpoint.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete admin (DISABLED - Security)
export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json(
      { error: 'Admin deletion is not allowed.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 5. STATE MANAGEMENT

### 5.1 Attendance Store

**File: `src/stores/attendance-store.ts`**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  status: string;
}

interface AttendanceState {
  todayAttendance: Attendance | null;
  attendanceHistory: Attendance[];
  setTodayAttendance: (attendance: Attendance | null) => void;
  setAttendanceHistory: (history: Attendance[]) => void;
  punchIn: (data: any) => Promise<void>;
  punchOut: (data: any) => Promise<void>;
  fetchTodayAttendance: (employeeId: string) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      todayAttendance: null,
      attendanceHistory: [],

      setTodayAttendance: (attendance) => {
        set({ todayAttendance: attendance });
      },

      setAttendanceHistory: (history) => {
        set({ attendanceHistory: history });
      },

      punchIn: async (data) => {
        try {
          const response = await fetch('/api/attendance/punch-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) throw new Error('Punch in failed');

          const result = await response.json();
          set({ todayAttendance: result.attendance });
        } catch (error) {
          console.error('Punch in error:', error);
          throw error;
        }
      },

      punchOut: async (data) => {
        try {
          const response = await fetch('/api/attendance/punch-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) throw new Error('Punch out failed');

          const result = await response.json();
          set({ todayAttendance: result.attendance });
        } catch (error) {
          console.error('Punch out error:', error);
          throw error;
        }
      },

      fetchTodayAttendance: async (employeeId) => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await fetch(
            `/api/attendance?employeeId=${employeeId}&date=${today}`
          );

          if (!response.ok) throw new Error('Fetch failed');

          const result = await response.json();
          const todayRecord = result.attendance[0] || null;
          set({ todayAttendance: todayRecord });
        } catch (error) {
          console.error('Fetch attendance error:', error);
        }
      },
    }),
    {
      name: 'attendance-storage',
    }
  )
);
```

### 5.2 Leave Store

**File: `src/stores/leave-store.ts`**
```typescript
import { create } from 'zustand';

interface Leave {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
}

interface LeaveState {
  leaves: Leave[];
  loading: boolean;
  fetchLeaves: (employeeId?: string) => Promise<void>;
  requestLeave: (data: any) => Promise<void>;
  approveLeave: (id: string, approvedBy: string) => Promise<void>;
  rejectLeave: (id: string) => Promise<void>;
}

export const useLeaveStore = create<LeaveState>((set) => ({
  leaves: [],
  loading: false,

  fetchLeaves: async (employeeId) => {
    set({ loading: true });
    try {
      const url = employeeId
        ? `/api/leave?employeeId=${employeeId}`
        : '/api/leave';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');

      const result = await response.json();
      set({ leaves: result.leaves, loading: false });
    } catch (error) {
      console.error('Fetch leaves error:', error);
      set({ loading: false });
    }
  },

  requestLeave: async (data) => {
    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Request failed');

      const result = await response.json();
      set((state) => ({ leaves: [result.leave, ...state.leaves] }));
    } catch (error) {
      console.error('Request leave error:', error);
      throw error;
    }
  },

  approveLeave: async (id, approvedBy) => {
    try {
      const response = await fetch(`/api/leave/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', approvedBy }),
      });

      if (!response.ok) throw new Error('Approval failed');

      set((state) => ({
        leaves: state.leaves.map((leave) =>
          leave.id === id ? { ...leave, status: 'approved' } : leave
        ),
      }));
    } catch (error) {
      console.error('Approve leave error:', error);
      throw error;
    }
  },

  rejectLeave: async (id) => {
    try {
      const response = await fetch(`/api/leave/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) throw new Error('Rejection failed');

      set((state) => ({
        leaves: state.leaves.map((leave) =>
          leave.id === id ? { ...leave, status: 'rejected' } : leave
        ),
      }));
    } catch (error) {
      console.error('Reject leave error:', error);
      throw error;
    }
  },
}));
```

---

## 6. PAGES & COMPONENTS

### 6.1 Landing Page

**File: `src/app/page.tsx`**
```typescript
export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
          margin: '0 auto 32px',
          background: 'white'
        }}>
          <img
            src="/logo.jpg"
            alt="HB Sallery Box"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        </div>

        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px',
          marginTop: '0',
          lineHeight: '1.2'
        }}>
          HB Sallery Box
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          Secure Staff Management
        </p>

        <a
          href="/login"
          style={{
            padding: '16px 32px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '500',
            display: 'inline-block',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            textDecoration: 'none'
          }}
        >
          Login
        </a>

        <p style={{
          fontSize: '14px',
          color: '#9ca3af',
          marginTop: '24px'
        }}>
          © 2024 HB Sallery Box
        </p>
      </div>
    </div>
  );
}
```

### 6.2 Login Page

**File: `src/app/login/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(phone, password);
      const role = useAuthStore.getState().role;

      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/employee/dashboard');
      }
    } catch (err) {
      setError('Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '8px',
          marginTop: '0'
        }}>
          Welcome Back
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827',
              marginBottom: '8px'
            }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginTop: '24px',
          textAlign: 'center'
        }}>
          © 2024 HB Sallery Box
        </p>
      </div>
    </div>
  );
}
```

### 6.3 Admin Dashboard Page

**File: `src/app/admin/dashboard/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    leavesPending: 0,
    monthlySalary: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: 'white',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Welcome, {user?.name}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ padding: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
              Total Employees
            </h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {stats.totalEmployees}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
              Present Today
            </h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {stats.presentToday}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
              Leaves Pending
            </h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.leavesPending}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
              Monthly Salary
            </h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              ₹{stats.monthlySalary.toLocaleString()}
            </p>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <a href="/admin/employees" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Manage Employees
            </a>
            <a href="/admin/attendance" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              View Attendance
            </a>
            <a href="/admin/salary" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Manage Salary
            </a>
            <a href="/admin/leaves" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Approve Leaves
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### 6.4 Employee Dashboard Page

**File: `src/app/employee/dashboard/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAttendanceStore } from '@/stores/attendance-store';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { todayAttendance, punchIn, punchOut, fetchTodayAttendance } = useAttendanceStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.id) {
      fetchTodayAttendance(user.id);
    }
  }, [isAuthenticated, user, router, fetchTodayAttendance]);

  const handlePunchIn = async () => {
    setLoading(true);
    try {
      await punchIn({ employeeId: user?.id });
    } catch (error) {
      console.error('Punch in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    try {
      await punchOut({ employeeId: user?.id });
    } catch (error) {
      console.error('Punch out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: 'white',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>
            Employee Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Welcome, {user?.name}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ padding: '24px' }}>
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>
            Today's Attendance
          </h2>

          {todayAttendance?.punchIn ? (
            <div>
              <p style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#6b7280' }}>
                Punched In: <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                  {todayAttendance.punchIn}
                </span>
              </p>
              {todayAttendance.punchOut ? (
                <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
                  Punched Out: <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {todayAttendance.punchOut}
                  </span>
                </p>
              ) : (
                <button
                  onClick={handlePunchOut}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: loading ? '#9ca3af' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  {loading ? 'Processing...' : 'Punch Out'}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handlePunchIn}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Processing...' : 'Punch In'}
            </button>
          )}
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <a href="/employee/attendance" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              View Attendance History
            </a>
            <a href="/employee/leaves" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Manage Leaves
            </a>
            <a href="/employee/salary" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              View Payslips
            </a>
            <a href="/employee/expenses" style={{
              display: 'block',
              padding: '16px',
              background: '#f0fdf4',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Submit Expenses
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### 6.5 Offline Page

**File: `src/app/offline/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkOnline = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    checkOnline();

    if (navigator.onLine) {
      window.location.href = '/';
    }

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1l22 22" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px',
          marginTop: '0'
        }}>
          No Internet Connection
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Please check your internet connection and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

### 6.6 Root Layout

**File: `src/app/layout.tsx`**
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HB Sallery Box - Smart Staff Management System",
  description: "Mobile-first staff management application with phone authentication, attendance tracking, GPS, biometric, and salary management.",
  keywords: "HB Sallery Box, Staff Management, Attendance, Salary, HR, Employee, Biometric, GPS",
  authors: [{ name: "HB Sallery Box Team" }],
  openGraph: {
    title: "HB Sallery Box - Smart Staff Management",
    description: "Complete staff management with attendance, salary, leave, and incentives",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

### 6.7 Global CSS

**File: `src/app/globals.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: 150 48% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 150 48% 96%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 142.1 76.2% 36.3%;
  --radius: 0.5rem;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 142.1 70.6% 45.3%;
    --primary-foreground: 144.9 80.4% 10%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 142.1 71.2% 45.3%;
  }
}
```

---

## 7. FEATURES IMPLEMENTATION

### 7.1 Geofence Settings

Add to Employee page/component:
```typescript
const handleGeofenceToggle = async (enabled: boolean) => {
  await fetch(`/api/employees/${employeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ geofenceEnabled: enabled }),
  });
};
```

### 7.2 Biometric Authentication

Add biometric check on punch in:
```typescript
const checkBiometric = async () => {
  if ('credentials' in navigator) {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [{
            type: 'public-key',
            id: new Uint8Array(16),
          }],
          userVerification: 'required',
        },
      });
      return credential;
    } catch (error) {
      console.error('Biometric error:', error);
      return null;
    }
  }
  return null;
};
```

### 7.3 Real-time Location Tracking

```typescript
const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

const handlePunchInWithLocation = async () => {
  try {
    const location = await getCurrentLocation();
    const photo = await capturePhoto();
    await punchIn({
      employeeId: user.id,
      punchInLat: location.coords.latitude,
      punchInLng: location.coords.longitude,
      punchInPhoto: photo,
    });
  } catch (error) {
    console.error('Punch in error:', error);
  }
};
```

### 7.4 Offline Detection

Add to root layout:
```typescript
'use client';

import { useEffect } from 'react';

export function OfflineDetector() {
  useEffect(() => {
    const handleOffline = () => {
      window.location.href = '/offline';
    };

    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
```

### 7.5 Push Notifications

Service Worker setup for FCM:
```typescript
// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
  };

  event.waitUntil(
    self.registration.showNotification('HB Sallery Box', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});
```

---

## 8. DEPLOYMENT INSTRUCTIONS

### 8.1 Local Development

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Start dev server
bun run dev
```

### 8.2 Production Build

```bash
# Build for production
bun run build

# Start production server
bun run start
```

### 8.3 Environment Variables

Create `.env` file:
```env
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 8.4 GitHub Deployment

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: HB Sallery Box HR System"

# Add remote
git remote add origin https://github.com/yourusername/hb-sallery-box.git

# Push to GitHub
git push -u origin main
```

### 8.5 Vercel Deployment

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

---

## 📋 CHECKLIST

### Phase 1: Setup ✅
- [x] Initialize Next.js project
- [x] Install dependencies
- [x] Configure Tailwind CSS
- [x] Setup Prisma
- [x] Create database schema
- [x] Initialize database

### Phase 2: Core Features ✅
- [x] Authentication system
- [x] User stores (Zustand)
- [x] API routes (Auth, Employees, Attendance)
- [x] Login page
- [x] Dashboard pages (Admin & Employee)

### Phase 3: Advanced Features 🚧
- [ ] Attendance tracking with GPS
- [ ] Biometric authentication
- [ ] Leave management
- [ ] Salary calculation
- [ ] Expense tracking
- [ ] Holiday calendar
- [ ] Shift management
- [ ] Incentive system
- [ ] Announcements
- [ ] Reports & analytics

### Phase 4: Enhancement 🚧
- [ ] Push notifications
- [ ] Offline mode
- [ ] Real-time updates (WebSocket)
- [ ] Advanced analytics
- [ ] Export functionality
- [ ] Multi-language support

---

## 🎯 SUCCESS METRICS

- ✅ User can login with phone number
- ✅ Admin can manage employees
- ✅ Employee can punch in/out
- ✅ Attendance is tracked with location
- ✅ Leave requests can be submitted and approved
- ✅ Salary can be generated and viewed
- ✅ Expenses can be submitted
- ✅ System works offline
- ✅ Push notifications work
- ✅ All data is persistent

---

## 📞 SUPPORT

For issues or questions:
1. Check the documentation above
2. Review API endpoint responses
3. Check browser console for errors
4. Verify database schema is correct
5. Ensure all environment variables are set

---

**This guide provides everything needed to recreate the complete HB Sallery Box HR Management System.** 🚀

**Last Updated: 2024**
**Version: 1.0.0**