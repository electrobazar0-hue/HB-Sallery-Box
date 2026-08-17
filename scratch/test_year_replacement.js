const { PrismaClient } = require('@prisma/client');
const http = require('http');
const prisma = new PrismaClient();

function fetchUrl(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 23000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No org found');
    return;
  }
  const adminId = org.adminId;

  console.log('=== TEST 1: Syncing Year 2026 ===');
  const sync1 = await fetchUrl('/api/holidays/sync', 'POST', { organizationId: org.id, adminId, year: 2026 });
  console.log('Sync 1 2026 result:', sync1.message);

  let h2026_1 = await fetchUrl(`/api/holidays?organizationId=${org.id}&year=2026`);
  console.log('Total 2026 holidays after first sync:', h2026_1.holidays.length);

  console.log('\n=== TEST 2: Re-Syncing Year 2026 (Clean Replacement / Duplicate Prevention) ===');
  const sync2 = await fetchUrl('/api/holidays/sync', 'POST', { organizationId: org.id, adminId, year: 2026 });
  console.log('Sync 2 2026 result:', sync2.message);

  let h2026_2 = await fetchUrl(`/api/holidays?organizationId=${org.id}&year=2026`);
  console.log('Total 2026 holidays after second sync (Should remain exactly 71, NOT 142):', h2026_2.holidays.length);

  console.log('\n=== TEST 3: Syncing Year 2025 ===');
  const sync3 = await fetchUrl('/api/holidays/sync', 'POST', { organizationId: org.id, adminId, year: 2025 });
  console.log('Sync 2025 result:', sync3.message);

  let h2025 = await fetchUrl(`/api/holidays?organizationId=${org.id}&year=2025`);
  console.log('Total 2025 holidays:', h2025.holidays.length);

  let h2026_check = await fetchUrl(`/api/holidays?organizationId=${org.id}&year=2026`);
  console.log('Total 2026 holidays after 2025 sync (Should still be preserved as 71):', h2026_check.holidays.length);

  let hAll = await fetchUrl(`/api/holidays?organizationId=${org.id}`);
  console.log('Total all holidays combined in DB:', hAll.holidays.length);

  await prisma.$disconnect();
}

run().catch(console.error);
