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
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const data = await fetchUrl('https://jayantur13.github.io/calendar-bharat/calendar/2026.json');
  console.log('Keys:', Object.keys(data));
  console.log('Sample Data:', JSON.stringify(data, null, 2).slice(0, 1500));
}

run();
