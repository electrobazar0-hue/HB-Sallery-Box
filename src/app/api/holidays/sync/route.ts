import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type HolidayItem = { date: string; name: string; type: string };
type HolidaySource = 'india-post' | 'office-holidays-ics' | 'google-calendar' | 'static-database';

const INDIA_POST_HOLIDAYS_URL = 'https://www.indiapost.gov.in/holidays-list';
const OFFICE_HOLIDAYS_ICS_URL = 'https://www.officeholidays.com/ics-clean/india';

const FALLBACK_HOLIDAYS: Record<string, HolidayItem[]> = {
  '2024': [
    { date: '2024-01-01', name: "New Year's Day", type: 'company' },
    { date: '2024-01-14', name: 'Makar Sankranti / Pongal', type: 'festival' },
    { date: '2024-01-26', name: 'Republic Day (National Holiday)', type: 'national' },
    { date: '2024-03-08', name: 'Maha Shivaratri', type: 'festival' },
    { date: '2024-03-25', name: 'Holi (Festival of Colours)', type: 'festival' },
    { date: '2024-03-29', name: 'Good Friday', type: 'festival' },
    { date: '2024-04-01', name: 'Annual Bank Closing (IPPB & Banks)', type: 'company' },
    { date: '2024-04-11', name: 'Id-ul-Fitr (Ramzan Id)', type: 'festival' },
    { date: '2024-04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'national' },
    { date: '2024-04-21', name: 'Mahavir Jayanti', type: 'festival' },
    { date: '2024-05-01', name: 'Labour Day / May Day', type: 'national' },
    { date: '2024-05-23', name: 'Buddha Purnima', type: 'festival' },
    { date: '2024-06-17', name: 'Bakri Id / Id-ul-Zuha', type: 'festival' },
    { date: '2024-07-17', name: 'Muharram', type: 'festival' },
    { date: '2024-08-15', name: 'Independence Day (National Holiday)', type: 'national' },
    { date: '2024-08-19', name: 'Raksha Bandhan', type: 'festival' },
    { date: '2024-08-26', name: 'Janmashtami', type: 'festival' },
    { date: '2024-09-07', name: 'Ganesh Chaturthi', type: 'festival' },
    { date: '2024-09-16', name: 'Milad-un-Nabi (Id-e-Milad)', type: 'festival' },
    { date: '2024-10-02', name: 'Mahatma Gandhi Jayanti (National Holiday)', type: 'national' },
    { date: '2024-10-12', name: 'Dussehra (Vijaya Dashami)', type: 'festival' },
    { date: '2024-10-31', name: 'Diwali (Deepavali)', type: 'festival' },
    { date: '2024-11-01', name: 'Govardhan Puja', type: 'festival' },
    { date: '2024-11-02', name: 'Bhai Dooj', type: 'festival' },
    { date: '2024-11-15', name: 'Guru Nanak Jayanti', type: 'festival' },
    { date: '2024-12-25', name: 'Christmas Day', type: 'festival' },
  ],
  '2025': [
    { date: '2025-01-01', name: "New Year's Day", type: 'company' },
    { date: '2025-01-14', name: 'Makar Sankranti / Pongal', type: 'festival' },
    { date: '2025-01-26', name: 'Republic Day', type: 'national' },
    { date: '2025-02-26', name: 'Maha Shivaratri', type: 'festival' },
    { date: '2025-03-14', name: 'Holi', type: 'festival' },
    { date: '2025-03-31', name: 'Id-ul-Fitr (Ramzan Id)', type: 'festival' },
    { date: '2025-04-01', name: 'Annual Bank Closing / IPPB Closing', type: 'company' },
    { date: '2025-04-06', name: 'Mahavir Jayanti', type: 'festival' },
    { date: '2025-04-14', name: 'Dr. B.R. Ambedkar Jayanti / Vaisakhi', type: 'national' },
    { date: '2025-04-18', name: 'Good Friday', type: 'festival' },
    { date: '2025-05-12', name: 'Buddha Purnima', type: 'festival' },
    { date: '2025-06-07', name: 'Bakri Id / Id-ul-Zuha', type: 'festival' },
    { date: '2025-07-06', name: 'Muharram', type: 'festival' },
    { date: '2025-08-15', name: 'Independence Day', type: 'national' },
    { date: '2025-08-16', name: 'Janmashtami (Vaishnava)', type: 'festival' },
    { date: '2025-09-05', name: 'Milad-un-Nabi (Id-e-Milad)', type: 'festival' },
    { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national' },
    { date: '2025-10-20', name: 'Dussehra (Vijaya Dashami)', type: 'festival' },
    { date: '2025-11-01', name: 'Diwali (Deepavali)', type: 'festival' },
    { date: '2025-11-02', name: 'Govardhan Puja', type: 'festival' },
    { date: '2025-11-03', name: 'Bhai Duj', type: 'festival' },
    { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'festival' },
    { date: '2025-12-25', name: 'Christmas Day', type: 'festival' },
  ],
  '2026': [
    { date: '2026-01-01', name: "New Year's Day", type: 'company' },
    { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'festival' },
    { date: '2026-01-26', name: 'Republic Day (National Holiday)', type: 'national' },
    { date: '2026-02-15', name: 'Maha Shivaratri', type: 'festival' },
    { date: '2026-03-04', name: 'Holi (Festival of Colours)', type: 'festival' },
    { date: '2026-03-21', name: 'Id-ul-Fitr (Ramzan Id)', type: 'festival' },
    { date: '2026-04-01', name: 'Annual Bank Closing (IPPB & Banks)', type: 'company' },
    { date: '2026-04-03', name: 'Good Friday', type: 'festival' },
    { date: '2026-04-14', name: 'Dr. B.R. Ambedkar Jayanti / Vaisakhi', type: 'national' },
    { date: '2026-04-21', name: 'Mahavir Jayanti', type: 'festival' },
    { date: '2026-05-01', name: 'May Day / Labour Day', type: 'national' },
    { date: '2026-05-28', name: 'Bakri Id / Id-ul-Zuha', type: 'festival' },
    { date: '2026-05-31', name: 'Buddha Purnima', type: 'festival' },
    { date: '2026-06-26', name: 'Muharram', type: 'festival' },
    { date: '2026-08-15', name: 'Independence Day (National Holiday)', type: 'national' },
    { date: '2026-08-27', name: 'Milad-un-Nabi (Id-e-Milad)', type: 'festival' },
    { date: '2026-09-04', name: 'Janmashtami', type: 'festival' },
    { date: '2026-09-14', name: 'Ganesh Chaturthi', type: 'festival' },
    { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti (National Holiday)', type: 'national' },
    { date: '2026-10-20', name: 'Dussehra (Vijaya Dashami)', type: 'festival' },
    { date: '2026-11-08', name: 'Diwali (Deepavali)', type: 'festival' },
    { date: '2026-11-09', name: 'Govardhan Puja', type: 'festival' },
    { date: '2026-11-10', name: 'Bhai Dooj', type: 'festival' },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti', type: 'festival' },
    { date: '2026-12-25', name: 'Christmas Day', type: 'festival' },
  ],
  '2027': [
    { date: '2027-01-01', name: "New Year's Day", type: 'company' },
    { date: '2027-01-14', name: 'Makar Sankranti / Pongal', type: 'festival' },
    { date: '2027-01-26', name: 'Republic Day (National Holiday)', type: 'national' },
    { date: '2027-03-07', name: 'Maha Shivaratri', type: 'festival' },
    { date: '2027-03-10', name: 'Id-ul-Fitr (Ramzan Id)', type: 'festival' },
    { date: '2027-03-23', name: 'Holi', type: 'festival' },
    { date: '2027-03-26', name: 'Good Friday', type: 'festival' },
    { date: '2027-04-01', name: 'Annual Bank Closing (IPPB & Banks)', type: 'company' },
    { date: '2027-04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'national' },
    { date: '2027-05-17', name: 'Bakri Id / Id-ul-Zuha', type: 'festival' },
    { date: '2027-05-20', name: 'Buddha Purnima', type: 'festival' },
    { date: '2027-08-15', name: 'Independence Day', type: 'national' },
    { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national' },
    { date: '2027-10-10', name: 'Dussehra (Vijaya Dashami)', type: 'festival' },
    { date: '2027-10-29', name: 'Diwali (Deepavali)', type: 'festival' },
    { date: '2027-11-14', name: 'Guru Nanak Jayanti', type: 'festival' },
    { date: '2027-12-25', name: 'Christmas Day', type: 'festival' },
  ],
};

const GOOGLE_CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com';

interface GoogleCalendarEvent {
  summary: string;
  start: { date?: string; dateTime?: string };
}

function classifyHolidayType(name: string): string {
  const lower = name.toLowerCase();

  if (['republic day', 'independence day', 'gandhi jayanti', 'mahatma gandhi'].some((keyword) => lower.includes(keyword))) {
    return 'national';
  }

  const festivalKeywords = [
    'holi', 'diwali', 'eid', 'id ul', 'christmas', 'dussehra', 'navratri',
    'janmashtami', 'ganesh', 'ram navami', 'pongal', 'sankranti', 'buddha',
    'shivaratri', 'bakri', 'muharram', 'guru', 'raksha', 'lohri', 'baisakhi',
    'vaisakhi', 'onam', 'bhai', 'govardhan', 'makar', 'easter', 'good friday',
    'ambedkar', 'mahavir', 'prophet', 'mohammad', 'milad',
  ];

  if (festivalKeywords.some((keyword) => lower.includes(keyword))) return 'festival';
  if (lower.includes('sunday') || lower.includes('saturday')) return 'weekly';
  return 'festival';
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeHtmlText(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIndiaPostDate(value: string): string | null {
  const match = value.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
  if (!match) return null;

  const months: Record<string, string> = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };

  const month = months[match[2].toLowerCase()];
  if (!month) return null;

  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
}

function dedupeAndSortHolidays(holidays: HolidayItem[]): HolidayItem[] {
  const seen = new Set<string>();
  return holidays
    .filter((holiday) => {
      const key = `${holiday.date}:${holiday.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseIndiaPostHolidays(html: string, year: number): HolidayItem[] {
  const text = normalizeHtmlText(html);
  const sectionMarker = `All India Holidays - ${year}`;
  const sectionStart = text.indexOf(sectionMarker);
  if (sectionStart === -1) return [];

  let section = text.slice(sectionStart + sectionMarker.length);
  const tableHeader = section.match(/Holiday Name\s+Date\s+Day/i);
  if (tableHeader?.index !== undefined) {
    section = section.slice(tableHeader.index + tableHeader[0].length);
  }

  const monthNames = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const days = 'Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday';
  const rowPattern = new RegExp(`\\s*(.+?)\\s+(\\d{1,2}-(?:${monthNames})-${year})\\s+(?:${days})`, 'gi');
  const holidays: HolidayItem[] = [];

  for (const match of section.matchAll(rowPattern)) {
    const date = parseIndiaPostDate(match[2]);
    const name = match[1].replace(/\s+/g, ' ').trim();
    if (!date || !name || name.toLowerCase().includes('select year')) continue;

    holidays.push({
      date,
      name,
      type: classifyHolidayType(name),
    });
  }

  return dedupeAndSortHolidays(holidays);
}

async function fetchIndiaPostHolidays(year: number): Promise<HolidayItem[]> {
  const response = await fetch(INDIA_POST_HOLIDAYS_URL, {
    next: { revalidate: 86400 },
    headers: { 'User-Agent': 'HB-Sallery-Box/1.0' },
  });

  if (!response.ok) throw new Error(`India Post returned ${response.status}`);

  const html = await response.text();
  const holidays = parseIndiaPostHolidays(html, year);
  if (holidays.length === 0) throw new Error(`India Post did not publish All India holidays for ${year}`);

  return holidays;
}

function parseIcsDate(value: string): string | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseIcsText(value: string): string {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/^India:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOfficeHolidaysIcs(ics: string, year: number): HolidayItem[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const holidays: HolidayItem[] = [];

  for (const match of unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
    const block = match[1];
    const dateMatch = block.match(/^DTSTART(?:;[^:]*)?:(\d{8})/m);
    const summaryMatch = block.match(/^SUMMARY(?:;[^:]*)?:(.+)$/m);
    const date = dateMatch ? parseIcsDate(dateMatch[1]) : null;
    const name = summaryMatch ? parseIcsText(summaryMatch[1]) : '';

    if (!date?.startsWith(`${year}-`) || !name) continue;

    holidays.push({
      date,
      name,
      type: classifyHolidayType(name),
    });
  }

  return dedupeAndSortHolidays(holidays);
}

async function fetchOfficeHolidaysCalendar(year: number): Promise<HolidayItem[]> {
  const response = await fetch(OFFICE_HOLIDAYS_ICS_URL, {
    next: { revalidate: 86400 },
    headers: { 'User-Agent': 'HB-Sallery-Box/1.0' },
  });

  if (!response.ok) throw new Error(`Office Holidays iCal returned ${response.status}`);

  const ics = await response.text();
  const holidays = parseOfficeHolidaysIcs(ics, year);
  if (holidays.length === 0) throw new Error(`Office Holidays iCal did not include ${year}`);

  return holidays;
}

async function fetchGoogleCalendarHolidays(year: number): Promise<HolidayItem[]> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) throw new Error('No Google Calendar API key');

  const calendarId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true&maxResults=100&orderBy=startTime`;

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Google Calendar API returned ${response.status}`);

  const data = await response.json();
  if (!data.items) throw new Error('No Google Calendar items');

  return data.items
    .map((event: GoogleCalendarEvent) => ({
      date: event.start?.date || event.start?.dateTime?.split('T')[0] || '',
      name: event.summary || 'Indian Holiday',
      type: classifyHolidayType(event.summary || ''),
    }))
    .filter((holiday: HolidayItem) => holiday.date);
}

async function getIndianHolidays(year: number): Promise<{ holidays: HolidayItem[]; source: HolidaySource }> {
  try {
    const holidays = await fetchIndiaPostHolidays(year);
    if (holidays.length > 0) return { holidays, source: 'india-post' };
  } catch (error) {
    console.warn('India Post holiday fetch failed:', error);
  }

  try {
    const holidays = await fetchOfficeHolidaysCalendar(year);
    if (holidays.length > 0) return { holidays, source: 'office-holidays-ics' };
  } catch (error) {
    console.warn('Office Holidays iCal fetch failed:', error);
  }

  if (process.env.GOOGLE_CALENDAR_API_KEY) {
    try {
      const holidays = await fetchGoogleCalendarHolidays(year);
      if (holidays.length > 0) return { holidays, source: 'google-calendar' };
    } catch (error) {
      console.warn('Google Calendar failed:', error);
    }
  }

  return {
    holidays: (FALLBACK_HOLIDAYS[String(year)] || FALLBACK_HOLIDAYS['2026']).map((holiday) => ({ ...holiday })),
    source: 'static-database',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, adminId, year: yearParam } = body;

    if (!organizationId || !adminId) {
      return NextResponse.json({ success: false, error: 'Organization ID and Admin ID required' }, { status: 400 });
    }

    const year = Number(yearParam) || new Date().getFullYear();
    const { holidays, source } = await getIndianHolidays(year);
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
            description: `Synced from ${source === 'india-post' ? 'India Post' : source === 'office-holidays-ics' ? 'Office Holidays iCal' : source === 'google-calendar' ? 'Google Calendar' : 'Indian Standard Calendar'}`,
            createdBy: adminId,
            status: 'draft',
            syncSource: source,
            isPaid: true,
          },
        });
        added++;
      } catch (error) {
        console.error('Error saving holiday:', error);
        errors++;
      }
    }

    const sourceLabels: Record<HolidaySource, string> = {
      'india-post': 'India Post (Government Live)',
      'office-holidays-ics': 'Office Holidays iCal (Live)',
      'google-calendar': 'Google Calendar (Live)',
      'static-database': 'Indian Standard Calendar',
    };

    return NextResponse.json({
      success: true,
      added,
      skipped,
      errors,
      total: holidays.length,
      source,
      sourceLabel: sourceLabels[source],
      year,
      message: `${added} new holidays added as draft, ${skipped} already existed`,
    });
  } catch (error) {
    console.error('Holiday sync error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync holidays' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const { holidays, source } = await getIndianHolidays(year);

  return NextResponse.json({
    success: true,
    holidays,
    count: holidays.length,
    year,
    source,
    hasGoogleKey: !!process.env.GOOGLE_CALENDAR_API_KEY,
  });
}
