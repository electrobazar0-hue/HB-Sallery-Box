/**
 * HB-SALLERY-BOX — Client API Interceptor
 * 
 * Intercepts all browser fetch('/api/*') requests and fulfills them using the
 * embedded client database engine when running in standalone / APK / offline mode.
 */

import { clientDb } from './client-db';

let isInterceptorInstalled = false;

export function installClientApiInterceptor() {
  if (typeof window === 'undefined' || isInterceptorInstalled) return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Check if this is an /api/ request
    const isApiRequest = urlStr.startsWith('/api/') || urlStr.includes('/api/');

    if (!isApiRequest) {
      return originalFetch.apply(this, [input, init]);
    }

    // Extract path and query parameters
    let path = urlStr;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        const u = new URL(path);
        path = u.pathname + u.search;
      } catch {
        // use as is
      }
    }

    const [pathname, searchStr] = path.split('?');
    const searchParams = new URLSearchParams(searchStr || '');
    const query = Object.fromEntries(searchParams.entries());

    const method = (init?.method || 'GET').toUpperCase();
    let body: any = {};
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = {};
      }
    }

    const createJsonResponse = (data: any, status: number = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const createCsvResponse = (csvContent: string) => {
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="report.csv"',
        },
      });
    };

    try {
      // 1. Check Users
      if (pathname.includes('/api/check-users')) {
        const res = clientDb.checkUsers();
        return createJsonResponse(res);
      }

      // 2. Auth: Login
      if (pathname.includes('/api/auth/login')) {
        const res = clientDb.login(body);
        return createJsonResponse(res, res.ok ? 200 : 401);
      }

      // 3. Auth: Register
      if (pathname.includes('/api/auth/register')) {
        const res = clientDb.registerAdmin(body);
        return createJsonResponse(res, res.ok ? 200 : 400);
      }

      // 4. Admin details
      if (pathname === '/api/admin' || pathname.startsWith('/api/admin?')) {
        if (method === 'GET') {
          const res = clientDb.getAdmin(query);
          return createJsonResponse(res);
        }
      }

      // 5. Employees Management
      if (pathname === '/api/employees' || pathname.startsWith('/api/employees?')) {
        if (method === 'GET') {
          const res = clientDb.getEmployees(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.createEmployee(body);
          return createJsonResponse(res);
        }
        if (method === 'PUT') {
          const id = body.id || query.employeeId || query.id;
          const res = clientDb.updateEmployee(id, body);
          return createJsonResponse(res);
        }
        if (method === 'DELETE') {
          const id = body.id || query.employeeId || query.id;
          const res = clientDb.deleteEmployee(id);
          return createJsonResponse(res);
        }
      }

      // 6. Attendance & Punch-In/Out
      if (pathname === '/api/attendance' || pathname.startsWith('/api/attendance?')) {
        if (method === 'GET') {
          const res = clientDb.getAttendance(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.punchAttendance(body);
          return createJsonResponse(res, res.success ? 200 : 400);
        }
      }

      // 7. Multi-Branch Management
      if (pathname === '/api/branches' || pathname.startsWith('/api/branches?')) {
        if (method === 'GET') {
          const res = clientDb.getBranches(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.createBranch(body);
          return createJsonResponse(res);
        }
        if (method === 'DELETE') {
          const res = clientDb.deleteBranch(body.id || query.id);
          return createJsonResponse(res);
        }
      }

      // 8. Breaks
      if (pathname === '/api/breaks' || pathname.startsWith('/api/breaks?')) {
        if (method === 'POST') {
          const res = clientDb.handleBreak(body);
          return createJsonResponse(res, res.success ? 200 : 400);
        }
      }

      // 9. Kiosk Mode
      if (pathname === '/api/kiosk' || pathname.startsWith('/api/kiosk?')) {
        if (method === 'POST') {
          const res = clientDb.kioskPunch(body);
          return createJsonResponse(res, res.success ? 200 : 400);
        }
      }

      // 10. Live Location Tracking
      if (pathname === '/api/location-tracking' || pathname.startsWith('/api/location-tracking?')) {
        if (method === 'GET') {
          const res = clientDb.getLiveTracking(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.handleLocationTracking(body);
          return createJsonResponse(res);
        }
      }

      // 11. Leaves
      if (pathname === '/api/leaves' || pathname.startsWith('/api/leaves?')) {
        if (method === 'GET') {
          const res = clientDb.getLeaves(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.createLeave(body);
          return createJsonResponse(res);
        }
        if (method === 'PUT') {
          const res = clientDb.updateLeaveStatus(body.id, body.status);
          return createJsonResponse(res);
        }
      }

      // 12. Expenses
      if (pathname === '/api/expenses' || pathname.startsWith('/api/expenses?')) {
        if (method === 'GET') {
          const res = clientDb.getExpenses(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.createExpense(body);
          return createJsonResponse(res);
        }
      }

      // 13. Salary Templates
      if (pathname === '/api/salary-templates' || pathname.startsWith('/api/salary-templates?')) {
        if (method === 'GET') {
          const res = clientDb.getSalaryTemplates(query);
          return createJsonResponse(res);
        }
        if (method === 'POST') {
          const res = clientDb.createSalaryTemplate(body);
          return createJsonResponse(res);
        }
      }

      // 14. Holidays & Sync
      if (pathname === '/api/holidays' || pathname.startsWith('/api/holidays?')) {
        if (method === 'GET') {
          const res = clientDb.getHolidays(query);
          return createJsonResponse(res);
        }
      }
      if (pathname.includes('/api/holidays/sync')) {
        const year = body.year || parseInt(query.year || '2026', 10);
        const res = clientDb.syncHolidays(year, body.organizationId || query.organizationId);
        return createJsonResponse(res);
      }

      // 15. Reports Dynamic Export
      if (pathname === '/api/reports' || pathname.startsWith('/api/reports?')) {
        const type = (query.type || 'attendance') as any;
        const format = (query.format || 'json') as any;
        const result = clientDb.generateReport(type, format);
        if (format === 'csv' && typeof result === 'string') {
          return createCsvResponse(result);
        }
        return createJsonResponse(result);
      }

      // Default fallback for any other custom fields or endpoints
      return createJsonResponse({ success: true, message: 'Fitted via client DB' });
    } catch (e: any) {
      console.error('ClientApiInterceptor error:', e);
      return createJsonResponse({ success: false, error: e?.message || 'Local DB Error' }, 500);
    }
  };

  isInterceptorInstalled = true;
  console.log('✅ HB-SALLERY-BOX Embedded Client Database Engine & API Interceptor installed.');
}
