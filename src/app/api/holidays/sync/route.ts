import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Fallback: Static Indian Holidays (used when API fails)
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

// Google Calendar - Indian Holidays public calendar
const GOOGLE_CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com';

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

// Determine holiday type from description/name
function classifyHolidayType(summary: string, description?: string): string {
  const desc = (description || '').toLowerCase();
  const name = summary.toLowerCase();
  
  // National holidays
  const nationalKeywords = ['republic day', 'independence day', 'gandhi jayanti'];
  if (nationalKeywords.some(k => name.includes(k))) return 'national';
  
  // Festival holidays
  const festivalKeywords = ['holi', 'diwali', 'eid', 'christmas', 'dussehra', 'navratri', 
    'janmashtami', 'ganesh', 'ram navami', 'pongal', 'sankranti', 'buddha', 'shivaratri',
    'bakri', 'muharram', 'guru', 'raksha', 'lohri', 'baisakhi', 'vaisakhi', 'onam',
    'bhai', 'govardhan', 'makar', 'christmas', 'easter', 'good friday', 'ambedkar'];
  if (festivalKeywords.some(k => name.includes(k))) return 'festival';
  
  // Weekly offs
  if (name.includes('sunday') || name.includes('saturday')) return 'weekly';
  
  // If description says "Observance" it's not a gazetted holiday
  if (desc.includes('observance')) return 'company';
  
  // Default
  return 'festival';
}

// Fetch holidays from Google Calendar API
async function fetchGoogleCalendarHolidays(year: number): Promise<GoogleCalendarEvent[]> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Calendar API key not configured');
  }

  const calendarId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;
  
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=100&orderBy=startTime`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Google Calendar API error:', errorData);
    throw new Error(`Google Calendar API returned ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('Invalid response from Google Calendar API');
  }

  return data.items;
}

// Sync holidays from Google Calendar into database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, adminId, year: yearParam } = body;

    if (!organizationId || !adminId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID and Admin ID are required',
      }, { status: 400 });
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found',
      }, { status: 400 });
    }

    const currentYear = yearParam || new Date().getFullYear();
    
    let holidays: Array<{ date: string; name: string; type: string; source: string }>;
    let source = 'fallback';

    // Try Google Calendar API first
    try {
      const googleEvents = await fetchGoogleCalendarHolidays(currentYear);
      
      if (googleEvents.length > 0) {
        holidays = googleEvents.map((event) => ({
          date: event.start?.date || event.start?.dateTime?.split('T')[0] || '',
          name: event.summary || 'Unknown Holiday',
          type: classifyHolidayType(event.summary, event.description),
          source: 'google-calendar',
        })).filter(h => h.date); // Filter out events without valid dates
        
        source = 'google-calendar';
        console.log(`Fetched ${holidays.length} holidays from Google Calendar for ${currentYear}`);
      } else {
        throw new Error('No events returned');
      }
    } catch (apiError) {
      console.warn('Google Calendar API failed, using fallback:', apiError);
      
      // Fallback to static data
      const fallbackList = FALLBACK_HOLIDAYS[String(currentYear)] || FALLBACK_HOLIDAYS['2025'];
      holidays = fallbackList.map(h => ({
        ...h,
        source: 'static-database',
      }));
      source = 'static-database';
    }

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const holiday of holidays) {
      try {
        const existing = await db.holiday.findUnique({
          where: {
            organizationId_date: {
              organizationId,
              date: holiday.date,
            },
          },
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
            description: `Synced from ${source === 'google-calendar' ? 'Google Calendar' : 'Static Database'}`,
            createdBy: adminId,
          },
        });

        added++;
      } catch (err) {
        console.error('Error saving holiday:', err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      skipped,
      errors,
      total: holidays.length,
      source,
      year: currentYear,
      message: source === 'google-calendar'
        ? `Synced ${added} holidays from Google Calendar (${skipped} already existed)`
        : `Synced ${added} holidays from offline database (${skipped} already existed). Set GOOGLE_CALENDAR_API_KEY for live data.`,
    });

  } catch (error) {
    console.error('Holiday sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync holidays',
    }, { status: 500 });
  }
}

// Get holidays (from Google Calendar or fallback)
export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get('year');
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
  
  let holidays: Array<{ summary: string; start: { date: string }; end: { date: string }; type: string }>;
  let source = 'fallback';

  // Try Google Calendar API first
  try {
    const googleEvents = await fetchGoogleCalendarHolidays(year);
    
    if (googleEvents.length > 0) {
      holidays = googleEvents.map((event) => ({
        summary: event.summary || 'Unknown Holiday',
        start: { date: event.start?.date || event.start?.dateTime?.split('T')[0] || '' },
        end: { date: event.end?.date || event.end?.dateTime?.split('T')[0] || '' },
        type: classifyHolidayType(event.summary, event.description),
      })).filter(h => h.start.date);
      
      source = 'google-calendar';
    } else {
      throw new Error('No events');
    }
  } catch (apiError) {
    console.warn('Google Calendar GET failed, using fallback');
    
    const fallbackList = FALLBACK_HOLIDAYS[String(year)] || FALLBACK_HOLIDAYS['2025'];
    holidays = fallbackList.map(h => ({
      summary: h.name,
      start: { date: h.date },
      end: { date: h.date },
      type: h.type,
    }));
    source = 'static-database';
  }

  return NextResponse.json({
    success: true,
    holidays,
    count: holidays.length,
    year,
    source,
    sourceLabel: source === 'google-calendar' ? 'Google Calendar (Live)' : 'Offline Database (Static)',
  });
}
