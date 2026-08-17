const http = require('http');

function postSync(year = 2026) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      organizationId: 'org_test_123',
      adminId: 'admin_test_123',
      year: year
    });

    const options = {
      hostname: 'localhost',
      port: 23000,
      path: '/api/holidays/sync',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- Test 1: First Sync ---');
  const res1 = await postSync(2026);
  console.log('Result 1:', res1);

  console.log('\n--- Test 2: Re-syncing Same Year ---');
  const res2 = await postSync(2026);
  console.log('Result 2:', res2);
}

run().catch(console.error);
