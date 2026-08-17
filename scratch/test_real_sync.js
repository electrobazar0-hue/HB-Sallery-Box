const { PrismaClient } = require('@prisma/client');
const http = require('http');
const prisma = new PrismaClient();

function postSync(orgId, adminId, year = 2026) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      organizationId: orgId,
      adminId: adminId,
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
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log('No org found in DB');
    return;
  }
  console.log('Using Org:', org.id, 'Admin:', org.adminId);

  console.log('\n--- Syncing Holidays for 2026 ---');
  const res = await postSync(org.id, org.adminId, 2026);
  console.log('Result:', res);
}

run().catch(console.error).finally(() => prisma.$disconnect());
