import { randomUUID } from 'crypto';
import { Pool, type PoolClient } from 'pg';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;
type Direction = 'asc' | 'desc';
type WhereValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | { startsWith?: string; in?: string[] }
  | Record<string, unknown>;

type ModelOptions = {
  where?: Record<string, WhereValue>;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
  orderBy?: Record<string, Direction> | Array<Record<string, Direction>>;
  update?: Record<string, unknown>;
  create?: Record<string, unknown>;
};

const TABLES = {
  admin: 'Admin',
  announcement: 'Announcement',
  attendance: 'Attendance',
  employee: 'Employee',
  employeeIncentive: 'EmployeeIncentive',
  employeeShift: 'EmployeeShift',
  expense: 'Expense',
  holiday: 'Holiday',
  incentiveCategory: 'IncentiveCategory',
  leave: 'Leave',
  organization: 'Organization',
  payrollAdjustment: 'PayrollAdjustment',
  salaryRecord: 'SalaryRecord',
  shift: 'Shift',
} as const;

type ModelName = keyof typeof TABLES;
type TableName = (typeof TABLES)[ModelName];

const COLUMNS: Record<TableName, string[]> = {
  Admin: ['id', 'userId', 'password', 'securityPassword', 'name', 'phone', 'email', 'address', 'profilePhoto', 'createdAt', 'updatedAt'],
  Announcement: ['id', 'title', 'message', 'organizationId', 'active', 'createdAt', 'updatedAt'],
  Attendance: ['id', 'employeeId', 'date', 'punchIn', 'punchOut', 'punchInLat', 'punchInLng', 'punchOutLat', 'punchOutLng', 'punchInPhoto', 'punchOutPhoto', 'workHours', 'overtime', 'status', 'notes', 'createdAt', 'updatedAt'],
  Employee: ['id', 'userId', 'password', 'securityPassword', 'name', 'phone', 'email', 'address', 'designation', 'department', 'salary', 'overtimeRate', 'aadharNumber', 'panNumber', 'accountNumber', 'ifscCode', 'upiId', 'organizationId', 'adminId', 'biometricEnabled', 'profilePhoto', 'active', 'starOfMonth', 'geofenceEnabled', 'geofenceLat', 'geofenceLng', 'geofenceRadius', 'createdAt', 'updatedAt'],
  EmployeeIncentive: ['id', 'employeeId', 'categoryId', 'month', 'amount', 'reason', 'type', 'notes', 'createdAt'],
  EmployeeShift: ['id', 'employeeId', 'shiftId', 'createdAt'],
  Expense: ['id', 'employeeId', 'title', 'description', 'category', 'amount', 'currency', 'expenseDate', 'submittedAt', 'receiptUrl', 'status', 'approvedBy', 'approvedAt', 'rejectedAt', 'rejectionReason', 'paidAt', 'paymentMethod', 'paymentReference', 'createdAt', 'updatedAt'],
  Holiday: ['id', 'organizationId', 'holidayName', 'date', 'holidayType', 'description', 'allowPunch', 'isHalfDay', 'isPaid', 'isOptional', 'compensatoryOff', 'isRecurring', 'recurringDay', 'status', 'syncSource', 'createdBy', 'createdAt', 'updatedAt'],
  IncentiveCategory: ['id', 'name', 'description', 'amount', 'organizationId', 'active', 'createdAt', 'updatedAt'],
  Leave: ['id', 'employeeId', 'type', 'startDate', 'endDate', 'reason', 'status', 'attendanceAllow', 'approvedBy', 'approvedAt', 'createdAt', 'updatedAt'],
  Organization: ['id', 'name', 'address', 'gst', 'logo', 'adminId', 'createdAt', 'updatedAt'],
  PayrollAdjustment: ['id', 'employeeId', 'month', 'baseSalary', 'bonus', 'deductions', 'advance', 'advanceRecovery', 'netSalary', 'notes', 'status', 'paidAt', 'createdBy', 'createdAt', 'updatedAt'],
  SalaryRecord: ['id', 'employeeId', 'month', 'baseSalary', 'overtime', 'incentives', 'deductions', 'netSalary', 'status', 'paidAt', 'createdAt', 'updatedAt'],
  Shift: ['id', 'name', 'startTime', 'endTime', 'graceMinutes', 'organizationId', 'createdAt', 'updatedAt'],
};

const COMPOSITE_KEYS: Record<string, string[]> = {
  employeeId_date: ['employeeId', 'date'],
  employeeId_month: ['employeeId', 'month'],
  organizationId_date: ['organizationId', 'date'],
  employeeId_shiftId: ['employeeId', 'shiftId'],
};

const DATABASE_URL = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  hbSalleryPool?: Pool;
  hbSallerySchemaReady?: Promise<void>;
};

function getPool() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add the Supabase Postgres connection string to .env.local or Vercel env vars.');
  }

  if (!globalForDb.hbSalleryPool) {
    globalForDb.hbSalleryPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 8,
    });
  }

  return globalForDb.hbSalleryPool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Admin" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "securityPassword" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT,
  "profilePhoto" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "gst" TEXT,
  "logo" TEXT,
  "adminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE IF EXISTS "Organization" ADD COLUMN IF NOT EXISTS "logo" TEXT;
CREATE TABLE IF NOT EXISTS "Employee" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "securityPassword" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT,
  "designation" TEXT,
  "department" TEXT,
  "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overtimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "aadharNumber" TEXT,
  "panNumber" TEXT,
  "accountNumber" TEXT,
  "ifscCode" TEXT,
  "upiId" TEXT,
  "organizationId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
  "profilePhoto" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "starOfMonth" BOOLEAN NOT NULL DEFAULT false,
  "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
  "geofenceLat" DOUBLE PRECISION,
  "geofenceLng" DOUBLE PRECISION,
  "geofenceRadius" DOUBLE PRECISION DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Attendance" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "punchIn" TEXT,
  "punchOut" TEXT,
  "punchInLat" DOUBLE PRECISION,
  "punchInLng" DOUBLE PRECISION,
  "punchOutLat" DOUBLE PRECISION,
  "punchOutLng" DOUBLE PRECISION,
  "punchInPhoto" TEXT,
  "punchOutPhoto" TEXT,
  "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'present',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "EmployeeIncentive" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "categoryId" TEXT,
  "month" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'bonus',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "EmployeeShift" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "expenseDate" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receiptUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "paidAt" TIMESTAMP(3),
  "paymentMethod" TEXT,
  "paymentReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Holiday" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "holidayName" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "holidayType" TEXT NOT NULL,
  "description" TEXT,
  "allowPunch" BOOLEAN NOT NULL DEFAULT false,
  "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
  "isPaid" BOOLEAN NOT NULL DEFAULT true,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  "compensatoryOff" BOOLEAN NOT NULL DEFAULT false,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurringDay" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "syncSource" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "IncentiveCategory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "organizationId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Leave" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attendanceAllow" BOOLEAN NOT NULL DEFAULT true,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "PayrollAdjustment" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "advance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "advanceRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "SalaryRecord" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "baseSalary" DOUBLE PRECISION NOT NULL,
  "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "incentives" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netSalary" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Shift" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "graceMinutes" INTEGER NOT NULL DEFAULT 15,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_userId_key" ON "Admin"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_phone_key" ON "Admin"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_adminId_key" ON "Organization"("adminId");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_phone_key" ON "Employee"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeShift_employeeId_shiftId_key" ON "EmployeeShift"("employeeId", "shiftId");
CREATE UNIQUE INDEX IF NOT EXISTS "Holiday_organizationId_date_key" ON "Holiday"("organizationId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollAdjustment_employeeId_month_key" ON "PayrollAdjustment"("employeeId", "month");
CREATE UNIQUE INDEX IF NOT EXISTS "SalaryRecord_employeeId_month_key" ON "SalaryRecord"("employeeId", "month");
CREATE INDEX IF NOT EXISTS "Holiday_date_idx" ON "Holiday"("date");
CREATE INDEX IF NOT EXISTS "Holiday_organizationId_idx" ON "Holiday"("organizationId");
CREATE INDEX IF NOT EXISTS "EmployeeIncentive_month_idx" ON "EmployeeIncentive"("month");
CREATE INDEX IF NOT EXISTS "EmployeeIncentive_employeeId_idx" ON "EmployeeIncentive"("employeeId");
CREATE INDEX IF NOT EXISTS "Expense_employeeId_idx" ON "Expense"("employeeId");
CREATE INDEX IF NOT EXISTS "Expense_status_idx" ON "Expense"("status");
CREATE INDEX IF NOT EXISTS "PayrollAdjustment_month_idx" ON "PayrollAdjustment"("month");
`;

async function ensureSchema() {
  if (!globalForDb.hbSallerySchemaReady) {
    globalForDb.hbSallerySchemaReady = getPool().query(SCHEMA_SQL).then(() => undefined).catch((error) => {
      globalForDb.hbSallerySchemaReady = undefined;
      throw error;
    });
  }

  return globalForDb.hbSallerySchemaReady;
}

function q(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function hasColumn(table: TableName, column: string) {
  return COLUMNS[table].includes(column);
}

function filterData(table: TableName, data: Record<string, unknown>, forInsert: boolean) {
  const now = new Date();
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || !hasColumn(table, key)) continue;
    clean[key] = value;
  }

  if (forInsert && hasColumn(table, 'id') && clean.id == null) {
    clean.id = randomUUID();
  }
  if (forInsert && hasColumn(table, 'createdAt') && clean.createdAt == null) {
    clean.createdAt = now;
  }
  if (hasColumn(table, 'updatedAt')) {
    clean.updatedAt = now;
  }

  return clean;
}

function buildWhere(table: TableName, where: Record<string, WhereValue> | undefined, values: unknown[]) {
  const conditions: string[] = [];
  if (!where) return '';

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === 'employee' && value && typeof value === 'object' && !Array.isArray(value)) {
      const relationWhere = value as Record<string, unknown>;
      if (relationWhere.organizationId) {
        values.push(relationWhere.organizationId);
        conditions.push(`${q('employeeId')} IN (SELECT ${q('id')} FROM ${q('Employee')} WHERE ${q('organizationId')} = $${values.length})`);
      }
      continue;
    }

    if (COMPOSITE_KEYS[key] && value && typeof value === 'object' && !Array.isArray(value)) {
      const composite = value as Record<string, unknown>;
      for (const column of COMPOSITE_KEYS[key]) {
        values.push(composite[column]);
        conditions.push(`${q(column)} = $${values.length}`);
      }
      continue;
    }

    if (!hasColumn(table, key)) continue;

    if (value === null) {
      conditions.push(`${q(key)} IS NULL`);
      continue;
    }

    if (typeof value === 'object' && !(value instanceof Date)) {
      const operator = value as { startsWith?: string; in?: string[] };
      if (operator.startsWith !== undefined) {
        values.push(`${operator.startsWith}%`);
        conditions.push(`${q(key)} LIKE $${values.length}`);
      } else if (operator.in !== undefined) {
        if (operator.in.length === 0) {
          conditions.push('FALSE');
        } else {
          const placeholders = operator.in.map((item) => {
            values.push(item);
            return `$${values.length}`;
          });
          conditions.push(`${q(key)} IN (${placeholders.join(', ')})`);
        }
      }
      continue;
    }

    values.push(value);
    conditions.push(`${q(key)} = $${values.length}`);
  }

  return conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
}

function buildOrderBy(table: TableName, orderBy: ModelOptions['orderBy']) {
  if (!orderBy) return '';
  const parts: string[] = [];
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

  for (const order of orders) {
    for (const [column, direction] of Object.entries(order)) {
      if (!hasColumn(table, column)) continue;
      parts.push(`${q(column)} ${String(direction).toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`);
    }
  }

  return parts.length ? ` ORDER BY ${parts.join(', ')}` : '';
}

function project(row: Record<string, unknown> | null, select?: Record<string, boolean>) {
  if (!row || !select) return row;
  const selected: Record<string, unknown> = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) selected[key] = row[key];
  }
  return selected;
}

class ModelClient {
  constructor(
    private model: ModelName,
    private queryable?: Queryable,
  ) {}

  private get table() {
    return TABLES[this.model];
  }

  private get executor() {
    return this.queryable ?? getPool();
  }

  async findMany(options: ModelOptions = {}) {
    await ensureSchema();
    const values: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, values);
    const orderSql = buildOrderBy(this.table, options.orderBy);
    const result = await this.executor.query(`SELECT * FROM ${q(this.table)}${whereSql}${orderSql}`, values);
    return Promise.all(result.rows.map((row) => this.applyResultOptions(row, options)));
  }

  async findUnique(options: ModelOptions) {
    await ensureSchema();
    const values: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, values);
    const result = await this.executor.query(`SELECT * FROM ${q(this.table)}${whereSql} LIMIT 1`, values);
    const row = result.rows[0] || null;
    return this.applyResultOptions(row, options);
  }

  async count(options: ModelOptions = {}) {
    await ensureSchema();
    const values: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, values);
    const result = await this.executor.query(`SELECT COUNT(*)::int AS count FROM ${q(this.table)}${whereSql}`, values);
    return result.rows[0]?.count ?? 0;
  }

  async create(options: ModelOptions) {
    await ensureSchema();
    const rawData = (options.data || {}) as Record<string, unknown>;
    const nestedShifts = this.model === 'employee'
      ? (rawData.shifts as { create?: Array<{ shiftId: string }> } | undefined)?.create
      : undefined;
    const data = filterData(this.table, rawData, true);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const result = await this.executor.query(
      `INSERT INTO ${q(this.table)} (${columns.map(q).join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values,
    );

    if (nestedShifts?.length && this.model === 'employee') {
      const employeeId = result.rows[0].id as string;
      await new ModelClient('employeeShift', this.executor).createMany({
        data: nestedShifts.map((shift) => ({ employeeId, shiftId: shift.shiftId })),
      });
    }

    return this.applyResultOptions(result.rows[0], options);
  }

  async createMany(options: ModelOptions) {
    await ensureSchema();
    const rows = Array.isArray(options.data) ? options.data : [];
    let count = 0;
    for (const row of rows) {
      await this.create({ data: row });
      count++;
    }
    return { count };
  }

  async update(options: ModelOptions) {
    await ensureSchema();
    const data = filterData(this.table, (options.data || {}) as Record<string, unknown>, false);
    const updates = Object.keys(data);
    const values = Object.values(data);
    const whereValues: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, whereValues);

    if (updates.length === 0) {
      const existing = await this.findUnique({ where: options.where, include: options.include, select: options.select });
      if (!existing) throw new Error(`${this.table} not found`);
      return existing;
    }

    const setSql = updates.map((column, index) => `${q(column)} = $${index + 1}`).join(', ');
    const shiftedWhere = whereSql.replace(/\$(\d+)/g, (_, number) => `$${Number(number) + values.length}`);
    const result = await this.executor.query(
      `UPDATE ${q(this.table)} SET ${setSql}${shiftedWhere} RETURNING *`,
      [...values, ...whereValues],
    );

    if (!result.rows[0]) throw new Error(`${this.table} not found`);
    return this.applyResultOptions(result.rows[0], options);
  }

  async updateMany(options: ModelOptions) {
    await ensureSchema();
    const data = filterData(this.table, (options.data || {}) as Record<string, unknown>, false);
    const updates = Object.keys(data);
    const values = Object.values(data);
    const whereValues: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, whereValues);
    if (updates.length === 0) return { count: 0 };

    const setSql = updates.map((column, index) => `${q(column)} = $${index + 1}`).join(', ');
    const shiftedWhere = whereSql.replace(/\$(\d+)/g, (_, number) => `$${Number(number) + values.length}`);
    const result = await this.executor.query(
      `UPDATE ${q(this.table)} SET ${setSql}${shiftedWhere}`,
      [...values, ...whereValues],
    );

    return { count: result.rowCount ?? 0 };
  }

  async delete(options: ModelOptions) {
    await ensureSchema();
    if (this.model === 'shift' && options.where?.id) {
      await new ModelClient('employeeShift', this.executor).deleteMany({ where: { shiftId: options.where.id as string } });
    }

    const values: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, values);
    const result = await this.executor.query(`DELETE FROM ${q(this.table)}${whereSql} RETURNING *`, values);
    return result.rows[0] || null;
  }

  async deleteMany(options: ModelOptions) {
    await ensureSchema();
    const values: unknown[] = [];
    const whereSql = buildWhere(this.table, options.where, values);
    const result = await this.executor.query(`DELETE FROM ${q(this.table)}${whereSql}`, values);
    return { count: result.rowCount ?? 0 };
  }

  async upsert(options: ModelOptions) {
    const existing = await this.findUnique({ where: options.where });
    if (existing && typeof existing === 'object' && 'id' in existing) {
      return this.update({
        where: { id: (existing as Record<string, unknown>).id as string },
        data: options.update,
        include: options.include,
        select: options.select,
      });
    }

    return this.create({
      data: options.create,
      include: options.include,
      select: options.select,
    });
  }

  private async applyResultOptions(row: Record<string, unknown> | null, options: ModelOptions) {
    if (!row) return null;
    const withIncludes = options.include ? await this.applyIncludes(row, options.include) : row;
    return project(withIncludes, options.select);
  }

  private async applyIncludes(row: Record<string, unknown>, include: Record<string, unknown>) {
    const result = { ...row };

    for (const [relation, relationOptions] of Object.entries(include)) {
      result[relation] = await this.loadRelation(row, relation, relationOptions);
    }

    return result;
  }

  private async loadRelation(row: Record<string, unknown>, relation: string, relationOptions: unknown) {
    const nested = typeof relationOptions === 'object' && relationOptions !== null
      ? relationOptions as { include?: Record<string, unknown>; select?: Record<string, boolean> }
      : {};

    const findOne = async (model: ModelName, where: Record<string, WhereValue>) => (
      new ModelClient(model, this.executor).findUnique({ where, include: nested.include, select: nested.select })
    );
    const findMany = async (model: ModelName, where: Record<string, WhereValue>) => (
      new ModelClient(model, this.executor).findMany({ where, include: nested.include, select: nested.select })
    );

    if (this.model === 'admin' && relation === 'organization') {
      return findOne('organization', { adminId: row.id as string });
    }
    if (this.model === 'organization' && relation === 'admin') {
      return findOne('admin', { id: row.adminId as string });
    }
    if (this.model === 'employee' && relation === 'organization') {
      return findOne('organization', { id: row.organizationId as string });
    }
    if (this.model === 'employee' && relation === 'admin') {
      return findOne('admin', { id: row.adminId as string });
    }
    if (this.model === 'employee' && relation === 'shifts') {
      return findMany('employeeShift', { employeeId: row.id as string });
    }
    if (this.model === 'employeeShift' && relation === 'shift') {
      return findOne('shift', { id: row.shiftId as string });
    }
    if (this.model === 'employeeShift' && relation === 'employee') {
      return findOne('employee', { id: row.employeeId as string });
    }
    if (this.model === 'shift' && relation === 'employees') {
      return findMany('employeeShift', { shiftId: row.id as string });
    }
    if (['attendance', 'salaryRecord', 'payrollAdjustment', 'expense', 'leave', 'employeeIncentive'].includes(this.model) && relation === 'employee') {
      return findOne('employee', { id: row.employeeId as string });
    }
    if (this.model === 'employeeIncentive' && relation === 'category') {
      return row.categoryId ? findOne('incentiveCategory', { id: row.categoryId as string }) : null;
    }
    if (['announcement', 'holiday', 'shift', 'incentiveCategory'].includes(this.model) && relation === 'organization') {
      return findOne('organization', { id: row.organizationId as string });
    }

    return null;
  }
}

function createDb(queryable?: Queryable) {
  const dbClient = Object.fromEntries(
    Object.keys(TABLES).map((model) => [model, new ModelClient(model as ModelName, queryable)]),
  ) as Record<ModelName, ModelClient>;

  return {
    ...dbClient,
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      await ensureSchema();
      const executor = queryable ?? getPool();
      const text = strings.reduce((sql, chunk, index) => (
        `${sql}${chunk}${index < values.length ? `$${index + 1}` : ''}`
      ), '');
      return executor.query(text, values).then((result) => result.rows);
    },
    async $transaction<T>(callback: (tx: ReturnType<typeof createDb>) => Promise<T>) {
      await ensureSchema();
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const result = await callback(createDb(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export const db = createDb();
