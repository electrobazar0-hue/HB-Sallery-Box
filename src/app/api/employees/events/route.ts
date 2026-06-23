import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/employees/events?organizationId=xxx
// Returns upcoming birthdays and work anniversaries (next 30 days)
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const employees = await db.employee.findMany({
      where: { organizationId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBirthdays: any[] = [];
    const todayAnniversaries: any[] = [];
    const upcomingBirthdays: any[] = [];
    const upcomingAnniversaries: any[] = [];

    for (const emp of employees) {
      const joinDate = new Date(emp.createdAt);
      joinDate.setHours(0, 0, 0, 0);

      // Calculate work anniversary - next occurrence
      const joinMonth = joinDate.getMonth();
      const joinDay = joinDate.getDate();

      // This year's anniversary
      let anniversaryThisYear = new Date(today.getFullYear(), joinMonth, joinDay);
      anniversaryThisYear.setHours(0, 0, 0, 0);

      // If this year's anniversary has passed, use next year
      if (anniversaryThisYear < today) {
        anniversaryThisYear = new Date(today.getFullYear() + 1, joinMonth, joinDay);
        anniversaryThisYear.setHours(0, 0, 0, 0);
      }

      const diffMs = anniversaryThisYear.getTime() - today.getTime();
      const daysAway = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const years = anniversaryThisYear.getFullYear() - joinDate.getFullYear();

      // Only include if within 30 days
      if (daysAway <= 30) {
        const anniversaryEvent = {
          employee: {
            id: emp.id,
            name: emp.name,
            designation: emp.designation,
            department: emp.department,
            profilePhoto: emp.profilePhoto,
          },
          date: anniversaryThisYear.toISOString().split('T')[0],
          type: 'work-anniversary',
          years,
          daysAway,
        };

        if (daysAway === 0) {
          todayAnniversaries.push(anniversaryEvent);
        } else {
          upcomingAnniversaries.push(anniversaryEvent);
        }
      }

      // Birthdays - no dateOfBirth field yet, so this will always be empty
      // When dateOfBirth is added to the schema, uncomment below:
      // const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth) : null;
      // if (dob) {
      //   const dobMonth = dob.getMonth();
      //   const dobDay = dob.getDate();
      //   let birthdayThisYear = new Date(today.getFullYear(), dobMonth, dobDay);
      //   birthdayThisYear.setHours(0, 0, 0, 0);
      //   if (birthdayThisYear < today) {
      //     birthdayThisYear = new Date(today.getFullYear() + 1, dobMonth, dobDay);
      //     birthdayThisYear.setHours(0, 0, 0, 0);
      //   }
      //   const bDiffMs = birthdayThisYear.getTime() - today.getTime();
      //   const bDaysAway = Math.round(bDiffMs / (1000 * 60 * 60 * 24));
      //   if (bDaysAway <= 30) {
      //     const birthdayEvent = { ... };
      //     if (bDaysAway === 0) todayBirthdays.push(birthdayEvent);
      //     else upcomingBirthdays.push(birthdayEvent);
      //   }
      // }
    }

    // Sort upcoming by daysAway
    upcomingAnniversaries.sort((a, b) => a.daysAway - b.daysAway);
    upcomingBirthdays.sort((a, b) => a.daysAway - b.daysAway);

    return NextResponse.json({
      success: true,
      today: {
        birthdays: todayBirthdays,
        anniversaries: todayAnniversaries,
      },
      upcoming: {
        birthdays: upcomingBirthdays,
        anniversaries: upcomingAnniversaries,
      },
    });
  } catch (error) {
    console.error('Error fetching employee events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}