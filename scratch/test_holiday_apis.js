const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data.slice(0, 500) });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- Testing Calendar Bharat 2025 ---');
  try {
    const res1 = await fetchUrl('https://jayantur13.github.io/calendar-bharat/calendar/2025.json');
    console.log('2025 Status:', res1.status, 'Items:', Array.isArray(res1.data) ? res1.data.length : typeof res1.data);
    if (Array.isArray(res1.data)) {
      console.log('Sample 2025:', res1.data.slice(0, 3));
    }
  } catch (e) {
    console.log('Error 2025:', e.message);
  }

  console.log('\n--- Testing Calendar Bharat 2026 ---');
  try {
    const res2 = await fetchUrl('https://jayantur13.github.io/calendar-bharat/calendar/2026.json');
    console.log('2026 Status:', res2.status, 'Items:', Array.isArray(res2.data) ? res2.data.length : typeof res2.data);
    if (Array.isArray(res2.data)) {
      console.log('Sample 2026:', res2.data.slice(0, 3));
    }
  } catch (e) {
    console.log('Error 2026:', e.message);
  }
}

run();
