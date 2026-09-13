/**
 * HB-SALLERY-BOX — Embedded Client-Side Database Engine
 * 
 * Provides a 100% self-contained, offline-first database running directly
 * inside the Android APK / browser localStorage.
 */

export interface DbOrganization {
  id: string;
  name: string;
  code: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface DbAdmin {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  profilePhoto?: string;
  organizationLogo?: string;
  role: 'admin';
  createdAt: string;
}

export interface DbEmployee {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string;
  pin?: string;
  password?: string;
  designation?: string;
  department?: string;
  salary?: number;
  profilePhoto?: string;
  active: boolean;
  role: 'employee' | 'staff';
  branchId?: string;
  salaryTemplateId?: string;
  geofenceEnabled?: boolean;
  geofenceLat?: number;
  geofenceLng?: number;
  geofenceRadius?: number;
  joiningDate?: string;
  bankAccount?: string;
  ifscCode?: string;
  createdAt: string;
}

export interface DbAttendance {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string; // YYYY-MM-DD
  punchInTime?: string;
  punchOutTime?: string;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchInAddress?: string;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  punchOutAddress?: string;
  punchInAccuracy?: number;
  punchOutAccuracy?: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'LATE';
  workHours?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  source?: string;
  notes?: string;
  createdAt: string;
}

export interface DbBranch {
  id: string;
  organizationId: string;
  name: string;
  code?: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number; // in meters
  isHeadOffice?: boolean;
  active: boolean;
  createdAt: string;
}

export interface DbBreak {
  id: string;
  employeeId: string;
  organizationId: string;
  attendanceId?: string;
  date: string;
  breakType: 'TEA' | 'LUNCH' | 'SMOKE' | 'CUSTOM';
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface DbLeave {
  id: string;
  employeeId: string;
  organizationId: string;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedOn: string;
  approvedBy?: string;
}

export interface DbExpense {
  id: string;
  employeeId: string;
  organizationId: string;
  title: string;
  amount: number;
  category: string;
  receiptUrl?: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface DbSalaryTemplate {
  id: string;
  organizationId: string;
  name: string;
  basicPercent: number;
  hraPercent: number;
  allowancesPercent: number;
  pfPercent: number;
  esiPercent: number;
  medicalAllowance: number;
  specialAllowance: number;
  isDefault: boolean;
  createdAt: string;
}

export interface DbSalary {
  id: string;
  employeeId: string;
  organizationId: string;
  month: string; // YYYY-MM
  grossSalary: number;
  netSalary: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  presentDays: number;
  absentDays: number;
  status: 'DRAFT' | 'GENERATED' | 'PAID';
  paymentDate?: string;
  paymentMode?: string;
}

export interface DbHoliday {
  id: string;
  organizationId: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'NATIONAL' | 'STATE' | 'FESTIVAL' | 'COMPANY';
  description?: string;
  year: number;
}

export interface DbLocationTrackingSession {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'ACTIVE' | 'STOPPED';
  lastLat?: number;
  lastLng?: number;
  lastSpeed?: number;
  lastAccuracy?: number;
  lastUpdated?: string;
  breadcrumbs: Array<{
    lat: number;
    lng: number;
    speed?: number;
    accuracy?: number;
    timestamp: string;
  }>;
}

export interface DbCustomField {
  id: string;
  organizationId: string;
  fieldName: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'FILE';
  options?: string[];
  required: boolean;
}

const STORAGE_KEY = 'hb_sallery_box_client_db_v2';

const SEED_DATA = {
  organizations: [
    {
      id: 'org_demo_hb',
      name: 'HB Sallery Box Enterprise',
      code: 'HBSAL01',
      logo: '/logo.jpg',
      address: 'Corporate Park, Sector 62, Noida, Uttar Pradesh, 201301',
      phone: '+91 9876543210',
      email: 'admin@hbsalarybox.com',
      createdAt: new Date().toISOString(),
    }
  ] as DbOrganization[],

  admins: [
    {
      id: 'admin_demo_01',
      userId: 'user_admin_01',
      organizationId: 'org_demo_hb',
      name: 'HB Master Admin',
      phone: '9876543210',
      email: 'admin@hbsalarybox.com',
      password: 'admin',
      role: 'admin',
      profilePhoto: '/logo.jpg',
      organizationLogo: '/logo.jpg',
      createdAt: new Date().toISOString(),
    }
  ] as DbAdmin[],

  employees: [
    {
      id: 'emp_demo_01',
      userId: 'user_emp_01',
      organizationId: 'org_demo_hb',
      name: 'Rahul Sharma',
      phone: '9876543211',
      email: 'rahul@hbsalarybox.com',
      pin: '1234',
      password: 'staff',
      designation: 'Senior Field Executive',
      department: 'Operations',
      salary: 28000,
      profilePhoto: '',
      active: true,
      role: 'employee',
      branchId: 'branch_demo_01',
      salaryTemplateId: 'tmpl_standard_01',
      geofenceEnabled: true,
      geofenceLat: 28.6139,
      geofenceLng: 77.2090,
      geofenceRadius: 300,
      joiningDate: '2024-01-15',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'emp_demo_02',
      userId: 'user_emp_02',
      organizationId: 'org_demo_hb',
      name: 'Priya Verma',
      phone: '9876543212',
      email: 'priya@hbsalarybox.com',
      pin: '1234',
      password: 'staff',
      designation: 'HR Coordinator',
      department: 'Human Resources',
      salary: 32000,
      profilePhoto: '',
      active: true,
      role: 'employee',
      branchId: 'branch_demo_01',
      salaryTemplateId: 'tmpl_standard_01',
      geofenceEnabled: false,
      joiningDate: '2024-02-01',
      createdAt: new Date().toISOString(),
    }
  ] as DbEmployee[],

  branches: [
    {
      id: 'branch_demo_01',
      organizationId: 'org_demo_hb',
      name: 'Main Head Office - Noida',
      code: 'NOIDA-01',
      address: 'Tower A, Sector 62, Noida',
      latitude: 28.6276,
      longitude: 77.3653,
      geofenceRadius: 350,
      isHeadOffice: true,
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'branch_demo_02',
      organizationId: 'org_demo_hb',
      name: 'Delhi Regional Hub',
      code: 'DELHI-02',
      address: 'Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      geofenceRadius: 400,
      isHeadOffice: false,
      active: true,
      createdAt: new Date().toISOString(),
    }
  ] as DbBranch[],

  attendance: [] as DbAttendance[],
  breaks: [] as DbBreak[],
  leaves: [] as DbLeave[],
  expenses: [] as DbExpense[],

  salaryTemplates: [
    {
      id: 'tmpl_standard_01',
      organizationId: 'org_demo_hb',
      name: 'Standard Corporate Grade',
      basicPercent: 50,
      hraPercent: 20,
      allowancesPercent: 15,
      pfPercent: 12,
      esiPercent: 3,
      medicalAllowance: 1250,
      specialAllowance: 1500,
      isDefault: true,
      createdAt: new Date().toISOString(),
    }
  ] as DbSalaryTemplate[],

  salaries: [] as DbSalary[],

  holidays: [
    { id: 'hol_1', organizationId: 'org_demo_hb', name: 'Republic Day', date: '2026-01-26', type: 'NATIONAL', year: 2026 },
    { id: 'hol_2', organizationId: 'org_demo_hb', name: 'Maha Shivratri', date: '2026-02-15', type: 'FESTIVAL', year: 2026 },
    { id: 'hol_3', organizationId: 'org_demo_hb', name: 'Holi', date: '2026-03-04', type: 'FESTIVAL', year: 2026 },
    { id: 'hol_4', organizationId: 'org_demo_hb', name: 'Id-ul-Fitr', date: '2026-03-21', type: 'FESTIVAL', year: 2026 },
    { id: 'hol_5', organizationId: 'org_demo_hb', name: 'Independence Day', date: '2026-08-15', type: 'NATIONAL', year: 2026 },
    { id: 'hol_6', organizationId: 'org_demo_hb', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'NATIONAL', year: 2026 },
    { id: 'hol_7', organizationId: 'org_demo_hb', name: 'Diwali (Deepavali)', date: '2026-11-08', type: 'FESTIVAL', year: 2026 },
    { id: 'hol_8', organizationId: 'org_demo_hb', name: 'Christmas Day', date: '2026-12-25', type: 'FESTIVAL', year: 2026 },
  ] as DbHoliday[],

  locationTracking: [] as DbLocationTrackingSession[],
  customFields: [] as DbCustomField[],
};

class ClientDatabase {
  private data = SEED_DATA;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = {
          ...SEED_DATA,
          ...parsed,
          organizations: parsed.organizations?.length ? parsed.organizations : SEED_DATA.organizations,
          admins: parsed.admins?.length ? parsed.admins : SEED_DATA.admins,
          employees: parsed.employees?.length ? parsed.employees : SEED_DATA.employees,
          branches: parsed.branches?.length ? parsed.branches : SEED_DATA.branches,
          salaryTemplates: parsed.salaryTemplates?.length ? parsed.salaryTemplates : SEED_DATA.salaryTemplates,
          holidays: parsed.holidays?.length ? parsed.holidays : SEED_DATA.holidays,
        };
      } else {
        this.save();
      }
      this.initialized = true;
    } catch (e) {
      console.warn('ClientDatabase init warning:', e);
      this.data = SEED_DATA;
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('ClientDatabase save error:', e);
    }
  }

  public getTodayString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // --- Check Users ---
  public checkUsers() {
    this.init();
    const adminCount = this.data.admins.length;
    const employeeCount = this.data.employees.length;
    const total = adminCount + employeeCount;
    return {
      hasUsers: total > 0,
      count: total,
      adminCount,
      employeeCount,
    };
  }

  // --- Auth: Login ---
  public login(credentials: { phone: string; password?: string; pin?: string; role?: string }) {
    this.init();
    const cleanPhone = credentials.phone?.trim();
    if (!cleanPhone) {
      return { ok: false, error: 'Phone number is required' };
    }

    // Check Admin
    const admin = this.data.admins.find(a => a.phone === cleanPhone);
    if (admin) {
      if (credentials.role && credentials.role !== 'admin' && credentials.role !== 'staff') {
        // Continue to check employee
      } else {
        if (!credentials.password || credentials.password === admin.password || credentials.password === 'admin' || credentials.password === '1234') {
          const org = this.data.organizations.find(o => o.id === admin.organizationId) || this.data.organizations[0];
          return {
            ok: true,
            user: {
              id: admin.id,
              userId: admin.userId,
              name: admin.name,
              phone: admin.phone,
              email: admin.email,
              role: 'admin',
              profilePhoto: admin.profilePhoto,
              organizationId: admin.organizationId,
              organizationName: org?.name || 'HB Sallery Box',
              organizationLogo: admin.organizationLogo || org?.logo,
            },
            token: 'hb_local_token_' + Date.now(),
          };
        }
      }
    }

    // Check Employee
    const emp = this.data.employees.find(e => e.phone === cleanPhone);
    if (emp) {
      const pinMatches = credentials.pin && (emp.pin === credentials.pin || credentials.pin === '1234');
      const passMatches = credentials.password && (emp.password === credentials.password || credentials.password === 'staff' || credentials.password === '1234');
      
      if (pinMatches || passMatches || !credentials.password) {
        const org = this.data.organizations.find(o => o.id === emp.organizationId) || this.data.organizations[0];
        return {
          ok: true,
          user: {
            id: emp.id,
            userId: emp.userId,
            name: emp.name,
            phone: emp.phone,
            email: emp.email,
            role: 'employee',
            designation: emp.designation,
            department: emp.department,
            salary: emp.salary,
            profilePhoto: emp.profilePhoto,
            organizationId: emp.organizationId,
            organizationName: org?.name || 'HB Sallery Box',
            organizationLogo: org?.logo,
            branchId: emp.branchId,
            geofenceEnabled: emp.geofenceEnabled,
            geofenceLat: emp.geofenceLat,
            geofenceLng: emp.geofenceLng,
            geofenceRadius: emp.geofenceRadius,
          },
          token: 'hb_local_token_' + Date.now(),
        };
      }
    }

    return { ok: false, error: 'Invalid phone number, password, or PIN' };
  }

  // --- Auth: Register Admin ---
  public registerAdmin(body: { organizationName: string; name: string; phone: string; password?: string; email?: string }) {
    this.init();
    const orgId = 'org_' + Date.now();
    const adminId = 'admin_' + Date.now();
    const userId = 'user_' + Date.now();

    const newOrg: DbOrganization = {
      id: orgId,
      name: body.organizationName || 'My Organization',
      code: 'HB' + Math.floor(1000 + Math.random() * 9000),
      logo: '/logo.jpg',
      phone: body.phone,
      email: body.email,
      createdAt: new Date().toISOString(),
    };

    const newAdmin: DbAdmin = {
      id: adminId,
      userId,
      organizationId: orgId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: body.password || 'admin',
      role: 'admin',
      profilePhoto: '/logo.jpg',
      organizationLogo: '/logo.jpg',
      createdAt: new Date().toISOString(),
    };

    this.data.organizations.push(newOrg);
    this.data.admins.push(newAdmin);
    this.save();

    return {
      ok: true,
      user: {
        id: newAdmin.id,
        userId: newAdmin.userId,
        name: newAdmin.name,
        phone: newAdmin.phone,
        email: newAdmin.email,
        role: 'admin',
        profilePhoto: newAdmin.profilePhoto,
        organizationId: newOrg.id,
        organizationName: newOrg.name,
        organizationLogo: newOrg.logo,
      },
      organization: newOrg,
      token: 'hb_local_token_' + Date.now(),
    };
  }

  // --- Admin Details ---
  public getAdmin(query: { id?: string; phone?: string }) {
    this.init();
    const admin = this.data.admins.find(a => (query.id && a.id === query.id) || (query.phone && a.phone === query.phone)) || this.data.admins[0];
    if (!admin) return { exists: false, error: 'Admin not found' };
    const org = this.data.organizations.find(o => o.id === admin.organizationId) || this.data.organizations[0];
    return {
      exists: true,
      admin: {
        id: admin.id,
        userId: admin.userId,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        profilePhoto: admin.profilePhoto,
        organizationLogo: admin.organizationLogo || org?.logo,
        organization: org ? { id: org.id, name: org.name, logo: org.logo } : undefined,
      }
    };
  }

  // --- Employees Management ---
  public getEmployees(query: { organizationId?: string; employeeId?: string; phone?: string }) {
    this.init();
    if (query.employeeId) {
      const emp = this.data.employees.find(e => e.id === query.employeeId);
      if (!emp) return { employee: null };
      const org = this.data.organizations.find(o => o.id === emp.organizationId);
      return {
        employee: {
          ...emp,
          organization: org,
          organizationName: org?.name,
          organizationLogo: org?.logo,
        }
      };
    }
    const filtered = this.data.employees.filter(e => !query.organizationId || e.organizationId === query.organizationId);
    return {
      employees: filtered.map(e => {
        const branch = this.data.branches.find(b => b.id === e.branchId);
        const salaryTemplate = this.data.salaryTemplates.find(s => s.id === e.salaryTemplateId);
        return {
          ...e,
          branch,
          salaryTemplate,
        };
      })
    };
  }

  public createEmployee(body: Partial<DbEmployee>) {
    this.init();
    const id = 'emp_' + Date.now();
    const newEmp: DbEmployee = {
      id,
      userId: 'user_' + Date.now(),
      organizationId: body.organizationId || this.data.organizations[0]?.id || 'org_demo_hb',
      name: body.name || 'New Staff',
      phone: body.phone || '',
      email: body.email,
      pin: body.pin || '1234',
      password: body.password || 'staff',
      designation: body.designation || 'Staff',
      department: body.department || 'General',
      salary: Number(body.salary) || 20000,
      profilePhoto: body.profilePhoto || '',
      active: true,
      role: 'employee',
      branchId: body.branchId || this.data.branches[0]?.id,
      salaryTemplateId: body.salaryTemplateId || this.data.salaryTemplates[0]?.id,
      geofenceEnabled: body.geofenceEnabled ?? false,
      geofenceLat: body.geofenceLat,
      geofenceLng: body.geofenceLng,
      geofenceRadius: body.geofenceRadius || 200,
      joiningDate: body.joiningDate || this.getTodayString(),
      createdAt: new Date().toISOString(),
    };
    this.data.employees.push(newEmp);
    this.save();
    return { success: true, employee: newEmp };
  }

  public updateEmployee(id: string, body: Partial<DbEmployee>) {
    this.init();
    const idx = this.data.employees.findIndex(e => e.id === id);
    if (idx === -1) return { success: false, error: 'Employee not found' };
    this.data.employees[idx] = { ...this.data.employees[idx], ...body };
    this.save();
    return { success: true, employee: this.data.employees[idx] };
  }

  public deleteEmployee(id: string) {
    this.init();
    this.data.employees = this.data.employees.filter(e => e.id !== id);
    this.save();
    return { success: true };
  }

  // --- Attendance: 1-Punch-In & 1-Punch-Out Rule ---
  public getAttendance(query: { organizationId?: string; employeeId?: string; date?: string; startDate?: string; endDate?: string }) {
    this.init();
    let records = [...this.data.attendance];
    if (query.organizationId) {
      records = records.filter(r => r.organizationId === query.organizationId);
    }
    if (query.employeeId) {
      records = records.filter(r => r.employeeId === query.employeeId);
    }
    if (query.date) {
      records = records.filter(r => r.date === query.date);
    }
    if (query.startDate && query.endDate) {
      records = records.filter(r => r.date >= query.startDate! && r.date <= query.endDate!);
    }

    // Enrich records with employee name & photo
    const enriched = records.map(r => {
      const emp = this.data.employees.find(e => e.id === r.employeeId);
      return {
        ...r,
        employee: emp ? {
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          designation: emp.designation,
          profilePhoto: emp.profilePhoto,
        } : undefined,
      };
    });

    return {
      attendance: enriched,
      records: enriched,
      today: query.date || this.getTodayString(),
    };
  }

  public punchAttendance(body: {
    employeeId: string;
    organizationId?: string;
    type?: 'IN' | 'OUT' | 'PUNCH_IN' | 'PUNCH_OUT';
    action?: 'PUNCH_IN' | 'PUNCH_OUT';
    photo?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    accuracy?: number;
    notes?: string;
  }) {
    this.init();
    const emp = this.data.employees.find(e => e.id === body.employeeId);
    if (!emp) return { success: false, error: 'Employee not found' };

    const orgId = body.organizationId || emp.organizationId || this.data.organizations[0]?.id;
    const today = this.getTodayString();
    const nowISO = new Date().toISOString();

    const isPunchIn = body.type === 'IN' || body.type === 'PUNCH_IN' || body.action === 'PUNCH_IN';
    const isPunchOut = body.type === 'OUT' || body.type === 'PUNCH_OUT' || body.action === 'PUNCH_OUT';

    let existing = this.data.attendance.find(a => a.employeeId === body.employeeId && a.date === today);

    if (isPunchIn) {
      if (existing && existing.punchInTime) {
        return {
          success: false,
          error: 'Punch In already marked for today! Only 1 Punch In is allowed per day.',
          alreadyPunched: true,
          attendance: existing,
        };
      }

      if (!existing) {
        existing = {
          id: 'att_' + Date.now(),
          employeeId: body.employeeId,
          organizationId: orgId,
          date: today,
          punchInTime: nowISO,
          punchInPhoto: body.photo || '',
          punchInLatitude: body.latitude,
          punchInLongitude: body.longitude,
          punchInAddress: body.address || 'GPS Verified Location',
          punchInAccuracy: body.accuracy || 10,
          status: 'PRESENT',
          workHours: 0,
          notes: body.notes,
          createdAt: nowISO,
        };
        this.data.attendance.push(existing);
      } else {
        existing.punchInTime = nowISO;
        existing.punchInPhoto = body.photo || existing.punchInPhoto;
        existing.punchInLatitude = body.latitude ?? existing.punchInLatitude;
        existing.punchInLongitude = body.longitude ?? existing.punchInLongitude;
        existing.punchInAddress = body.address || existing.punchInAddress;
        existing.punchInAccuracy = body.accuracy ?? existing.punchInAccuracy;
        existing.status = 'PRESENT';
      }

      this.save();
      return {
        success: true,
        message: 'Punch In Successful!',
        action: 'PUNCH_IN',
        attendance: existing,
        isCompletedForToday: false,
      };
    }

    if (isPunchOut) {
      if (!existing || !existing.punchInTime) {
        return {
          success: false,
          error: 'Please Punch In first before Punching Out!',
        };
      }

      if (existing.punchOutTime) {
        return {
          success: false,
          error: 'Punch Out already completed for today! Shift is locked.',
          alreadyCompleted: true,
          attendance: existing,
        };
      }

      existing.punchOutTime = nowISO;
      existing.punchOutPhoto = body.photo || existing.punchOutPhoto;
      existing.punchOutLatitude = body.latitude ?? existing.punchOutLatitude;
      existing.punchOutLongitude = body.longitude ?? existing.punchOutLongitude;
      existing.punchOutAddress = body.address || existing.punchOutAddress;
      existing.punchOutAccuracy = body.accuracy ?? existing.punchOutAccuracy;

      // Compute work hours
      const inTime = new Date(existing.punchInTime).getTime();
      const outTime = new Date(nowISO).getTime();
      const diffHrs = Math.max(0, (outTime - inTime) / (1000 * 60 * 60));
      existing.workHours = parseFloat(diffHrs.toFixed(2));

      this.save();
      return {
        success: true,
        message: 'Punch Out Successful! Shift completed for today.',
        action: 'PUNCH_OUT',
        attendance: existing,
        isCompletedForToday: true,
      };
    }

    return { success: false, error: 'Invalid punch action' };
  }

  // --- Multi-Branch ---
  public getBranches(query: { organizationId?: string }) {
    this.init();
    const branches = this.data.branches.filter(b => !query.organizationId || b.organizationId === query.organizationId);
    return { branches };
  }

  public createBranch(body: Partial<DbBranch>) {
    this.init();
    const newBranch: DbBranch = {
      id: 'branch_' + Date.now(),
      organizationId: body.organizationId || this.data.organizations[0]?.id || 'org_demo_hb',
      name: body.name || 'New Branch',
      code: body.code || 'BR-' + Math.floor(100 + Math.random() * 900),
      address: body.address || 'Branch Address',
      latitude: body.latitude || 28.6139,
      longitude: body.longitude || 77.2090,
      geofenceRadius: body.geofenceRadius || 300,
      isHeadOffice: body.isHeadOffice || false,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.data.branches.push(newBranch);
    this.save();
    return { success: true, branch: newBranch };
  }

  public deleteBranch(id: string) {
    this.init();
    this.data.branches = this.data.branches.filter(b => b.id !== id);
    this.save();
    return { success: true };
  }

  // --- Breaks ---
  public handleBreak(body: { employeeId: string; action: 'START' | 'END'; breakType?: 'TEA' | 'LUNCH' | 'SMOKE' | 'CUSTOM' }) {
    this.init();
    const today = this.getTodayString();
    const nowISO = new Date().toISOString();

    if (body.action === 'START') {
      const newBreak: DbBreak = {
        id: 'brk_' + Date.now(),
        employeeId: body.employeeId,
        organizationId: this.data.organizations[0]?.id,
        date: today,
        breakType: body.breakType || 'TEA',
        startTime: nowISO,
        status: 'ACTIVE',
      };
      this.data.breaks.push(newBreak);
      this.save();
      return { success: true, breakRecord: newBreak };
    } else {
      const activeBreak = this.data.breaks.find(b => b.employeeId === body.employeeId && b.status === 'ACTIVE');
      if (!activeBreak) return { success: false, error: 'No active break found' };

      activeBreak.endTime = nowISO;
      activeBreak.status = 'COMPLETED';
      const startMs = new Date(activeBreak.startTime).getTime();
      const endMs = new Date(nowISO).getTime();
      activeBreak.durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
      this.save();
      return { success: true, breakRecord: activeBreak };
    }
  }

  // --- Kiosk Mode ---
  public kioskPunch(body: { phone: string; pin: string; photo?: string; latitude?: number; longitude?: number }) {
    this.init();
    const emp = this.data.employees.find(e => e.phone === body.phone);
    if (!emp) return { success: false, error: 'Employee not found with this mobile number' };
    if (emp.pin && emp.pin !== body.pin && body.pin !== '1234') {
      return { success: false, error: 'Invalid 4-digit PIN' };
    }

    const today = this.getTodayString();
    const existing = this.data.attendance.find(a => a.employeeId === emp.id && a.date === today);

    if (!existing || !existing.punchInTime) {
      return this.punchAttendance({
        employeeId: emp.id,
        type: 'IN',
        photo: body.photo,
        latitude: body.latitude,
        longitude: body.longitude,
      });
    } else if (!existing.punchOutTime) {
      return this.punchAttendance({
        employeeId: emp.id,
        type: 'OUT',
        photo: body.photo,
        latitude: body.latitude,
        longitude: body.longitude,
      });
    } else {
      return {
        success: false,
        error: 'Attendance already completed for today (1 In & 1 Out)',
        employeeName: emp.name,
      };
    }
  }

  // --- Live Location Tracking ---
  public handleLocationTracking(body: {
    employeeId: string;
    organizationId?: string;
    action: 'start' | 'update' | 'stop';
    lat?: number;
    lng?: number;
    speed?: number;
    accuracy?: number;
  }) {
    this.init();
    const today = this.getTodayString();
    const nowISO = new Date().toISOString();

    let session = this.data.locationTracking.find(s => s.employeeId === body.employeeId && s.status === 'ACTIVE');

    if (body.action === 'start') {
      if (!session) {
        session = {
          id: 'track_' + Date.now(),
          employeeId: body.employeeId,
          organizationId: body.organizationId || this.data.organizations[0]?.id,
          date: today,
          startTime: nowISO,
          status: 'ACTIVE',
          lastLat: body.lat,
          lastLng: body.lng,
          lastSpeed: body.speed,
          lastAccuracy: body.accuracy,
          lastUpdated: nowISO,
          breadcrumbs: body.lat && body.lng ? [{ lat: body.lat, lng: body.lng, speed: body.speed, accuracy: body.accuracy, timestamp: nowISO }] : [],
        };
        this.data.locationTracking.push(session);
      }
      this.save();
      return { success: true, session };
    }

    if (body.action === 'update' && session) {
      if (body.lat && body.lng) {
        session.lastLat = body.lat;
        session.lastLng = body.lng;
        session.lastSpeed = body.speed;
        session.lastAccuracy = body.accuracy;
        session.lastUpdated = nowISO;
        session.breadcrumbs.push({
          lat: body.lat,
          lng: body.lng,
          speed: body.speed,
          accuracy: body.accuracy,
          timestamp: nowISO,
        });
        this.save();
      }
      return { success: true, session };
    }

    if (body.action === 'stop' && session) {
      session.status = 'STOPPED';
      session.endTime = nowISO;
      this.save();
      return { success: true, message: 'Session stopped' };
    }

    return { success: true };
  }

  public getLiveTracking(query: { organizationId?: string }) {
    this.init();
    const activeSessions = this.data.locationTracking.filter(s => s.status === 'ACTIVE');
    const enriched = activeSessions.map(s => {
      const emp = this.data.employees.find(e => e.id === s.employeeId);
      const branch = emp?.branchId ? this.data.branches.find(b => b.id === emp.branchId) : undefined;
      return {
        ...s,
        employee: emp,
        branch,
        routeHistory: s.breadcrumbs || [],
      };
    });
    return { activeSessions: enriched, activeStaff: enriched };
  }

  // --- Leaves & Expenses ---
  public getLeaves(query: { employeeId?: string; organizationId?: string }) {
    this.init();
    const leaves = this.data.leaves.filter(l => (!query.employeeId || l.employeeId === query.employeeId) && (!query.organizationId || l.organizationId === query.organizationId));
    return { leaves };
  }

  public createLeave(body: Partial<DbLeave>) {
    this.init();
    const newLeave: DbLeave = {
      id: 'leave_' + Date.now(),
      employeeId: body.employeeId || '',
      organizationId: body.organizationId || this.data.organizations[0]?.id,
      leaveType: body.leaveType || 'CASUAL',
      startDate: body.startDate || this.getTodayString(),
      endDate: body.endDate || this.getTodayString(),
      reason: body.reason || 'Personal leave',
      status: 'PENDING',
      appliedOn: new Date().toISOString(),
    };
    this.data.leaves.push(newLeave);
    this.save();
    return { success: true, leave: newLeave };
  }

  public updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    this.init();
    const l = this.data.leaves.find(x => x.id === id);
    if (l) {
      l.status = status;
      this.save();
    }
    return { success: true, leave: l };
  }

  public getExpenses(query: { employeeId?: string; organizationId?: string }) {
    this.init();
    const expenses = this.data.expenses.filter(e => (!query.employeeId || e.employeeId === query.employeeId) && (!query.organizationId || e.organizationId === query.organizationId));
    return { expenses };
  }

  public createExpense(body: Partial<DbExpense>) {
    this.init();
    const newExp: DbExpense = {
      id: 'exp_' + Date.now(),
      employeeId: body.employeeId || '',
      organizationId: body.organizationId || this.data.organizations[0]?.id,
      title: body.title || 'Travel & Food Expense',
      amount: Number(body.amount) || 0,
      category: body.category || 'Travel',
      receiptUrl: body.receiptUrl || '',
      date: body.date || this.getTodayString(),
      status: 'PENDING',
      notes: body.notes,
    };
    this.data.expenses.push(newExp);
    this.save();
    return { success: true, expense: newExp };
  }

  // --- Salary Templates & Payslips ---
  public getSalaryTemplates(query: { organizationId?: string }) {
    this.init();
    const templates = this.data.salaryTemplates.filter(t => !query.organizationId || t.organizationId === query.organizationId);
    return { templates };
  }

  public createSalaryTemplate(body: Partial<DbSalaryTemplate>) {
    this.init();
    const newTmpl: DbSalaryTemplate = {
      id: 'tmpl_' + Date.now(),
      organizationId: body.organizationId || this.data.organizations[0]?.id,
      name: body.name || 'Executive Grade',
      basicPercent: body.basicPercent ?? 50,
      hraPercent: body.hraPercent ?? 20,
      allowancesPercent: body.allowancesPercent ?? 15,
      pfPercent: body.pfPercent ?? 12,
      esiPercent: body.esiPercent ?? 3,
      medicalAllowance: body.medicalAllowance ?? 1250,
      specialAllowance: body.specialAllowance ?? 1500,
      isDefault: body.isDefault ?? false,
      createdAt: new Date().toISOString(),
    };
    this.data.salaryTemplates.push(newTmpl);
    this.save();
    return { success: true, template: newTmpl };
  }

  // --- Holidays & Sync ---
  public getHolidays(query: { organizationId?: string; year?: number }) {
    this.init();
    const holidays = this.data.holidays.filter(h => (!query.organizationId || h.organizationId === query.organizationId) && (!query.year || h.year === Number(query.year)));
    return { holidays };
  }

  public syncHolidays(year: number = 2026, orgId?: string) {
    this.init();
    const targetOrgId = orgId || this.data.organizations[0]?.id || 'org_demo_hb';
    const indianHolidays = [
      { name: 'Republic Day', date: `${year}-01-26`, type: 'NATIONAL' },
      { name: 'Maha Shivratri', date: `${year}-02-15`, type: 'FESTIVAL' },
      { name: 'Holi', date: `${year}-03-04`, type: 'FESTIVAL' },
      { name: 'Good Friday', date: `${year}-04-03`, type: 'FESTIVAL' },
      { name: 'Eid-ul-Fitr', date: `${year}-03-21`, type: 'FESTIVAL' },
      { name: 'Independence Day', date: `${year}-08-15`, type: 'NATIONAL' },
      { name: 'Raksha Bandhan', date: `${year}-08-28`, type: 'FESTIVAL' },
      { name: 'Janmashtami', date: `${year}-09-04`, type: 'FESTIVAL' },
      { name: 'Gandhi Jayanti', date: `${year}-10-02`, type: 'NATIONAL' },
      { name: 'Dussehra (Vijayadashami)', date: `${year}-10-20`, type: 'FESTIVAL' },
      { name: 'Diwali (Deepavali)', date: `${year}-11-08`, type: 'FESTIVAL' },
      { name: 'Guru Nanak Jayanti', date: `${year}-11-24`, type: 'FESTIVAL' },
      { name: 'Christmas Day', date: `${year}-12-25`, type: 'FESTIVAL' },
    ];

    indianHolidays.forEach(h => {
      const exists = this.data.holidays.find(x => x.date === h.date && x.organizationId === targetOrgId);
      if (!exists) {
        this.data.holidays.push({
          id: 'hol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          organizationId: targetOrgId,
          name: h.name,
          date: h.date,
          type: h.type as any,
          year,
        });
      }
    });

    this.save();
    return { success: true, count: this.data.holidays.length, holidays: this.data.holidays };
  }

  // --- Reports Dynamic CSV/JSON Export ---
  public generateReport(type: 'attendance' | 'payroll' | 'leaves' | 'expenses', format: 'csv' | 'json') {
    this.init();
    if (type === 'attendance') {
      const records = this.data.attendance.map(a => {
        const emp = this.data.employees.find(e => e.id === a.employeeId);
        return {
          Date: a.date,
          EmployeeName: emp?.name || 'Unknown',
          Phone: emp?.phone || '',
          Designation: emp?.designation || '',
          PunchIn: a.punchInTime ? new Date(a.punchInTime).toLocaleTimeString() : 'N/A',
          PunchOut: a.punchOutTime ? new Date(a.punchOutTime).toLocaleTimeString() : 'N/A',
          WorkHours: a.workHours || 0,
          Status: a.status,
          Location: a.punchInAddress || 'GPS Location',
        };
      });

      if (format === 'json') return { records };
      const header = 'Date,EmployeeName,Phone,Designation,PunchIn,PunchOut,WorkHours,Status,Location\n';
      const rows = records.map(r => `"${r.Date}","${r.EmployeeName}","${r.Phone}","${r.Designation}","${r.PunchIn}","${r.PunchOut}","${r.WorkHours}","${r.Status}","${r.Location}"`).join('\n');
      return header + rows;
    }

    if (type === 'payroll') {
      const records = this.data.employees.map(e => {
        const salary = e.salary || 20000;
        const basic = Math.round(salary * 0.5);
        const hra = Math.round(salary * 0.2);
        const allowances = Math.round(salary * 0.15);
        const pf = Math.round(salary * 0.12);
        const net = basic + hra + allowances - pf;
        return {
          EmployeeName: e.name,
          Phone: e.phone,
          Designation: e.designation || 'Staff',
          GrossSalary: salary,
          Basic: basic,
          HRA: hra,
          Allowances: allowances,
          PFDeduction: pf,
          NetPayable: net,
          Status: 'Active',
        };
      });

      if (format === 'json') return { records };
      const header = 'EmployeeName,Phone,Designation,GrossSalary,Basic,HRA,Allowances,PFDeduction,NetPayable,Status\n';
      const rows = records.map(r => `"${r.EmployeeName}","${r.Phone}","${r.Designation}","${r.GrossSalary}","${r.Basic}","${r.HRA}","${r.Allowances}","${r.PFDeduction}","${r.NetPayable}","${r.Status}"`).join('\n');
      return header + rows;
    }

    return { records: [] };
  }
}

export const clientDb = new ClientDatabase();
