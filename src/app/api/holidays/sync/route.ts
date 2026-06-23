import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Fallback: Static Indian Holidays
const FALLBACK_HOLIDAYS: Record<string, Array<{ date: string; name: string; type: string }>> = {
  '2025': [
    { date: '2025-01-01', name: "New Year's Day", type: 'company' },
    { date: '2025-01-14', name: 'Makar Sankranti / Pongal', type: 'festival' },
    { date: '2025-01-26', name: 'Republic Day', type: 'national' },
    { date: '2025-02-26', name: 'Maha Shivaratri', type: 'festival' },
    { date: '2025-03-14', name: 'Holi', type: 'festival' },
    { date: '2025-03-30', name: 'Id ul-Fitr', type: 'festival' },
    { date: '2025-04-06', name: 'Ram Navami', type: 'festival' },
    { date: '2025-04-14', name: 'Ambedkar Jayanti / Vaisakhi', type: 'national' },
    { date: '2025-05-12', name: 'Buddha Purnima', type: 'festival' },
    { date: '2025-06-07', name: 'Bakri Id', type: 'festival' },
    { date: '2025-08-15', name: 'Independence Day', type: 'national' },
    { date: '2025-08-16', name: 'Parsi New Year', type: 'festival' },
    { date: '2025-08-27', name: 'Janmashtami', type: 'festival' },
    { date: '2025-09-05', name: 'Ganesh Chaturthi', type: 'festival' },
    { date: '2025-10-02', name: 'Gandhi Jayanti', type: 'national' },
    { date: '2025-10-20', name: 'Dussehra', type: 'festival' },
    { date: '2025-10-21', name: 'Muharram', type: 'festival' },
    { date: '2025-11-05', name: 'Diwali', type: 'festival' },
    { date: '2025-11-06', name: 'Govardhan Puja', type: 'festival' },
    { date: '2025-11-07', name: 'Bhai Duj', type: 'festival' },
    { date: '2025-12-25', name: 'Christmas', type: 'festival' },
  ],
  '2026': [
    { date: '2026-01-01', name: "New Year's Day", type: 'company' },
    { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'festival' },
    { date: '2026-01-26', name: 'Republic Day', type: 'national' },
    { date: '2026-02-27', name: 'Maha Shivaratri', type: 'festival' },
    { date: '2026-03-04', name: 'Holi', type: 'festival' },
    { date: '2026-03-20', name: 'Id ul-Fitr', type: 'festival' },
    { date: '2026-04-02', name: 'Ram Navami', type: 'festival' },
    { date: '2026-04-14', name: 'Ambedkar Jayanti / Vaisakhi', type: 'national' },
    { date: '2026-05-26', name: 'Buddha Purnima', type: 'festival' },
    { date: '2026-06-27', name: 'Bakri Id', type: 'festival' },
    { date: '2026-08-15', name: 'Independence Day', type: 'national' },
    { date: '2026-08-17', name: 'Parsi New Year', type: 'festival' },
    { date: '2026-08-27', name: 'Janmashtami', type: 'festival' },
    { date: '2026-09-25', name: 'Ganesh Chaturthi', type: 'festival' },
    { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'national' },
    { date: '2026-10-09', name: 'Dussehra', type: 'festival' },
    { date: '2026-11-04', name: 'Diwali', type: 'festival' },
    { date: '2026-11-05', name: 'Govardhan Puja', type: 'festival' },
    { date: '2026-11-06', name: 'Bhai Duj', type: 'festival' },
    { date: '2026-12-25', name: 'Christmas', type: 'festival' },
  ],
};

const GOOGLE_CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com';

interface NagerDateHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

function classifyHolidayType(name: string): string {
  const lower = name.toLowerCase();
  const nationalKeywords = ['republic day', 'independence day', 'gandhi jayanti'];
  if (nationalKeywords.some(k => lower.includes(k))) return 'national';
  
  const festivalKeywords = ['holi', 'diwali', 'eid', 'christmas', 'dussehra', 'navratri', 
    'janmashtami', 'ganesh', 'ram navami', 'pongal', 'sankranti', 'buddha', 'shivaratri',
    'bakri', 'muharram', 'guru', 'raksha', 'lohri', 'baisakhi', 'vaisakhi', 'onam',
    'bhai', 'govardhan', 'makar', 'easter', 'good friday', 'ambedkar'];
  if (festivalKeywords.some(k => lower.includes(k))) return 'festival';
  
  if (lower.includes('sunday') || lower.includes('saturday')) return 'weekly';
  
  return 'festival';
}

// Source 1: Nager.Date API (Free, No API Key)
async function fetchNagerDateHolidays(year: number): Promise<Array<{ date: string; name: string; type: string }>> {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`Nager.Date returned ${response.status}`);
    const data: NagerDateHoliday[] = await response.json();
    return data
      .filter(h => h.global) // Only national/global holidays
      .map(h => ({
        date: h.date,
        name: h.localName || h.name,
        type: classifyHolidayType(h.name),
      }));
  } catch (err) {
    console.warn('Nager.Date API failed:', err);
    return [];
  }
}

// Source 2: Google Calendar API (Needs API Key)
async function fetchGoogleCalendarHolidays(year: number): Promise<Array<{ date: string; name: string; type: string }>> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) throw new Error('No API key');

  const calendarId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true&maxResults=100&orderBy=startTime`;

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Google Calendar API returned ${response.status}`);
  const data = await response.json();
  if (!data.items) throw new Error('No items');

  return data.items
    .map((event: GoogleCalendarEvent) => ({
      date: event.start?.date || event.start?.dateTime?.split('T')[0] || '',
      name: event.summary || 'Unknown Holiday',
      type: classifyHolidayType(event.summary),
    }))
    .filter(h => h.date);
}

// Sync holidays from APIs into database (all as DRAFT)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, adminId, year: yearParam } = body;

    if (!organizationId || !adminId) {
      return NextResponse.json({ success: false, error: 'Organization ID and Admin ID required' }, { status: 400 });
    }

    const currentYear = yearParam || new Date().getFullYear();
    let holidays: Array<{ date: string; name: string; type: string }> = [];
    let source = 'none';

    // Try Google Calendar first (if API key set)
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (apiKey) {
      try {
        holidays = await fetchGoogleCalendarHolidays(currentYear);
        if (holidays.length > 0) {
          source = 'google-calendar';
          console.log(`✅ Fetched ${holidays.length} holidays from Google Calendar`);
        }
      } catch (err) {
        console.warn('Google Calendar failed:', err);
      }
    }

    // Fallback to Nager.Date
    if (holidays.length === 0) {
      try {
        holidays = await fetchNagerDateHolidays(currentYear);
        if (holidays.length > 0) {
          source = 'nager-date';
          console.log(`✅ Fetched ${holidays.length} holidays from Nager.Date`);
        }
      } catch (err) {
        console.warn('Nager.Date failed:', err);
      }
    }

    // Final fallback to static database
    if (holidays.length === 0) {
      const fallbackList = FALLBACK_HOLIDAYS[String(currentYear)] || FALLBACK_HOLIDAYS['2025'];
      holidays = fallbackList.map(h => ({ ...h }));
      source = 'static-database';
      console.log(`✅ Using ${holidays.length} static holidays`);
    }

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const holiday of holidays) {
      try {
        const existing = await db.holiday.findUnique({
          where: { organizationId_date: { organizationId, date: holiday.date } },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await db.holiday.create({
          data: {
            organizationId,
            holidayName: holiday.name,
            date: holiday.date,
            holidayType: holiday.type,
            description: `Synced from ${source === 'google-calendar' ? 'Google Calendar' : source === 'nager-date' ? 'Nager.Date API' : 'Offline Database'}`,
            createdBy: adminId,
            status: 'draft', // ALL synced holidays start as DRAFT
            syncSource: source,
            isPaid: true,
          },
        });
        added++;
      } catch (err) {
        console.error('Error saving holiday:', err);
        errors++;
      }
    }

    const sourceLabels: Record<string, string> = {
      'google-calendar': `Google Calendar (Live)`,
      'nager-date': `Nager.Date API (Live)`,
      'static-database': `Offline Database (Static)`,
    };

    return NextResponse.json({
      success: true,
      added,
      skipped,
      errors,
      total: holidays.length,
      source,
      sourceLabel: sourceLabels[source] || source,
      year: currentYear,
      message: `${added} new holidays added as draft, ${skipped} already existed`,
    });
  } catch (error) {
    console.error('Holiday sync error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync holidays' }, { status: 500 });
  }
}

// GET - Preview holidays before syncing
export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get('year');
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  let holidays: Array<{ date: string; name: string; type: string }> = [];
  let source = 'none';

  // Try Google Calendar
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (apiKey) {
    try {
      holidays = await fetchGoogleCalendarHolidays(year);
      if (holidays.length > 0) source = 'google-calendar';
    } catch (err) {
      console.warn('Google Calendar preview failed:', err);
    }
  }

  // Fallback Nager.Date
  if (holidays.length === 0) {
    try {
      holidays = await fetchNagerDateHolidays(year);
      if (holidays.length > 0) source = 'nager-date';
    } catch (err) {
      console.warn('Nager.Date preview failed:', err);
    }
  }

  // Final fallback
  if (holidays.length === 0) {
    holidays = (FALLBACK_HOLIDAYS[String(year)] || FALLBACK_HOLIDAYS['2025']).map(h => ({ ...h }));
    source = 'static-database';
  }

  return NextResponse.json({
    success: true,
    holidays,
    count: holidays.length,
    year,
    source,
    hasGoogleKey: !!apiKey,
  });
}