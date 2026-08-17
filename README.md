# HB Salary Box - Attendance & Payroll Management System

A full-stack modern enterprise attendance, payroll, employee management, and holiday system built with Next.js 16 (Turbopack), Tailwind CSS, Prisma ORM, and SQLite.

## ✨ Key Features

- **Attendance & Geofencing**: Real-time punch-in/out with location validation, selfie capture, and automatic work hours calculation.
- **100% Manual Holiday Management**:
  - Add, edit, publish, draft (On/Off), and delete holidays manually.
  - Draft-first workflow: new holidays are saved as drafts until published by Admin.
  - Comprehensive attendance and salary rules (Paid, Punch Allowed, Half Day, Weekly Off, Floating/Optional, Compensatory Off).
  - Interactive monthly calendar with color-coded type badges.
- **Payroll & Salary Tracking**: Automated salary calculations, deductions, incentives, bonus, and expense management.
- **Employee & Admin Portals**: Role-based access control with biometric/PIN unlock and notifications.

## 🚀 Deployment (Render / Vercel / Node)

### Render Deployment Settings:
- **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
- **Start Command**: `node server.js`
- **Environment Variables**:
  - `DATABASE_URL`: `file:./dev.db`
  - `NODE_ENV`: `production`

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Generate Prisma Client & Push DB
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```
