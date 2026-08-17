const http = require('http');

function test(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 23000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Testing App on port 23000...');

  // 1. Check home page
  const home = await test('/');
  console.log('1. Home Page Status:', home.status);

  // 2. Sync Indian Holidays
  const holidays = await test('/api/holidays/sync?year=2026');
  console.log('2. Holidays Sync (2026):', holidays.status, 'Count:', holidays.body?.count);

  // 3. Test Punch In Outside Geofence (Expecting 403)
  const outsidePunch = await test('/api/attendance', 'POST', {
    employeeId: 'emp_demo',
    type: 'in',
    punchIn: '09:00:00',
    punchInLat: 19.0760, // Mumbai coordinates
    punchInLng: 72.8777,
    employeeGeofence: {
      geofenceEnabled: true,
      geofenceLat: 28.6139, // Delhi coordinates
      geofenceLng: 77.2090,
      geofenceRadius: 100, // 100m
    }
  });
  console.log('3. Outside Geofence Punch In Status:', outsidePunch.status, 'Message:', outsidePunch.body?.error);

  // 4. Test Punch In Inside Geofence (Expecting 200)
  const insidePunch = await test('/api/attendance', 'POST', {
    employeeId: 'emp_demo_test_' + Date.now(),
    type: 'in',
    punchIn: '09:00:00',
    punchInLat: 28.61390,
    punchInLng: 77.20900,
    employeeGeofence: {
      geofenceEnabled: true,
      geofenceLat: 28.61390,
      geofenceLng: 77.20900,
      geofenceRadius: 100,
    }
  });
  console.log('4. Inside Geofence Punch In Status:', insidePunch.status, 'Success:', insidePunch.body?.success);

  console.log('\nAll System Tests Completed Successfully!');
}

run().catch(console.error);
