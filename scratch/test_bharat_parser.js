const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseBharatDate(dateStr, year) {
  // Example format: "January 26, 2026, Monday" or "October 2, 2026, Friday"
  const match = dateStr.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return null;

  const monthName = match[1].toLowerCase();
  const day = match[2].padStart(2, '0');
  const matchedYear = match[3];

  const months = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12'
  };

  const month = months[monthName];
  if (!month) return null;

  return `${matchedYear}-${month}-${day}`;
}

function classifyBharatType(type, eventName) {
  const lowerName = eventName.toLowerCase();
  const lowerType = (type || '').toLowerCase();

  if (
    lowerName.includes('republic day') ||
    lowerName.includes('independence day') ||
    lowerName.includes('gandhi jayanti') ||
    lowerName.includes('ambedkar') ||
    lowerName.includes('labour day') ||
    lowerName.includes('may day')
  ) {
    return 'national';
  }

  if (
    lowerType.includes('government') ||
    lowerType.includes('national')
  ) {
    return 'national';
  }

  if (
    lowerName.includes('bank') ||
    lowerName.includes('ippb') ||
    lowerName.includes('closing') ||
    lowerName.includes('new year')
  ) {
    return 'company';
  }

  return 'festival';
}

async function run() {
  for (const year of [2025, 2026, 2027]) {
    console.log(`\n================== YEAR ${year} ==================`);
    const data = await fetchUrl(`https://jayantur13.github.io/calendar-bharat/calendar/${year}.json`);
    const yearObj = data[String(year)] || {};
    const holidays = [];

    for (const [monthKey, monthObj] of Object.entries(yearObj)) {
      if (!monthObj || typeof monthObj !== 'object') continue;
      for (const [dateKey, item] of Object.entries(monthObj)) {
        if (!item || !item.event) continue;
        const isoDate = parseBharatDate(dateKey, year);
        if (!isoDate) continue;

        // Filter out purely minor "Good to know" informational trivia unless it's a recognized holiday/festival
        const itemType = (item.type || '').toLowerCase();
        if (itemType === 'good to know' && !item.event.toLowerCase().includes('day') && !item.event.toLowerCase().includes('jayanti')) {
          continue;
        }

        holidays.push({
          date: isoDate,
          name: item.event,
          type: classifyBharatType(item.type, item.event),
          description: item.extras || item.type || 'Official Indian Holiday'
        });
      }
    }

    // Sort by date
    holidays.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`Total parsed holidays for ${year}: ${holidays.length}`);
    console.log('Sample first 5:');
    holidays.slice(0, 5).forEach(h => console.log(`  ${h.date}: ${h.name} (${h.type}) - ${h.description}`));
    console.log('Sample Republic Day / Independence Day / Gandhi Jayanti:');
    holidays.filter(h => h.name.includes('Republic') || h.name.includes('Independence') || h.name.includes('Gandhi') || h.name.includes('Diwali') || h.name.includes('Holi'))
      .forEach(h => console.log(`  ${h.date}: ${h.name} (${h.type})`));
  }
}

run().catch(console.error);
