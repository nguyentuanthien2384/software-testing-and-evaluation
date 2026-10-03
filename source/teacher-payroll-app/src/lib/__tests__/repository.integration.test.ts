import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { initialData } from '../initial-data';
import { createStateVersion } from '../state-version';
import { createSessionToken, SESSION_COOKIE } from '../session';
import type { AppData } from '../types';

jest.mock('../db', () => {
  const directory = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'payroll-integration-'));
  const databaseUrl = `file:${require('node:path').join(directory, 'isolated.db').replace(/\\/g, '/')}`;
  require('node:fs').writeFileSync(require('node:path').join(directory, 'isolated.db'), '');
  return { prisma: new (require('@prisma/client').PrismaClient)({ datasourceUrl: databaseUrl }), directory, databaseUrl };
});

const { prisma, directory, databaseUrl } = require('../db') as {
  prisma: PrismaClient; directory: string; databaseUrl: string;
};
const { getAllData, replaceAllData } = require('../repository') as typeof import('../repository');
const { GET, PUT } = require('../../app/api/state/route') as typeof import('../../app/api/state/route');
const { GET: report } = require('../../app/api/reports/route') as typeof import('../../app/api/reports/route');
const cookie = `${SESSION_COOKIE}=${createSessionToken({ username: 'admin', displayName: 'Admin', role: 'admin' })}`;

function stateRequest(method: 'GET' | 'PUT', body?: AppData, version?: string) {
  return new Request('http://localhost/api/state', {
    method,
    headers: { cookie, 'Content-Type': 'application/json', ...(version ? { 'X-State-Version': version } : {}) },
    ...(method === 'PUT' ? { body: JSON.stringify(body) } : {})
  });
}

describe('SQLite integration: migration, rollback và API thực tế', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe', timeout: 60_000
    });
  }, 70_000);

  beforeEach(async () => { await replaceAllData(structuredClone(initialData)); });

  afterAll(async () => {
    await prisma.$disconnect();
    // directory is created by mkdtemp under the OS temp root, never the workspace/database directory.
    if (path.dirname(directory) !== tmpdir()) throw new Error('Unexpected integration database directory');
    rmSync(directory, { recursive: true, force: true });
  });

  test('đọc/ghi đủ 10 bảng, khóa ngoại và số liệu tính lương', async () => {
    await expect(getAllData()).resolves.toEqual(initialData);
    const lines = await require('../repository').computePayrollLines('2024-2025');
    expect(lines).toHaveLength(4);
    // Independent arithmetic oracle: 45×1×1×143000×2, 45×1×1.1×143000×1.5,
    // 45×1.2×1×143000×2, 60×1.2×1.1×143000×1.5.
    expect(lines.map((line: { amount: number }) => line.amount)).toEqual([12_870_000, 10_617_750, 15_444_000, 16_988_400]);
    expect(lines.reduce((total: number, line: { amount: number }) => total + line.amount, 0)).toBe(55_920_150);
  });

  test('50 lượt đọc SQLite đồng thời đều hoàn tất với snapshot nhất quán', async () => {
    const snapshots = await Promise.all(Array.from({ length: 50 }, () => getAllData()));
    expect(snapshots).toHaveLength(50);
    for (const snapshot of snapshots) expect(snapshot).toEqual(initialData);
  }, 10_000);

  test('transaction bị lỗi cuối chuỗi insert khôi phục tất cả bảng cũ', async () => {
    const original = await getAllData();
    const invalid = structuredClone(original);
    invalid.departments[0].name = 'Không được lưu một phần';
    invalid.assignments[0].teacherId = 'MISSING-FOREIGN-KEY';
    await expect(replaceAllData(invalid)).rejects.toThrow();
    await expect(getAllData()).resolves.toEqual(original);
  });

  test('CSDL trống: state và báo cáo dùng cùng snapshot mẫu, lần PUT đầu lưu được', async () => {
    const empty = Object.fromEntries(Object.keys(initialData).map((key) => [key, []])) as unknown as AppData;
    await replaceAllData(empty);
    const state = await GET(stateRequest('GET'));
    await expect(state.json()).resolves.toEqual(initialData);
    const response = await report(new Request('http://localhost/api/reports?year=2024-2025', { headers: { cookie } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ count: 4, totalAmount: 55_920_150 });
    const saved = await PUT(stateRequest('PUT', initialData, state.headers.get('X-State-Version')!));
    expect(saved.status).toBe(200);
    await expect(getAllData()).resolves.toEqual(initialData);
  });

  test('PUT gặp lỗi CSDL rollback toàn bộ và không làm kẹt lần PUT tiếp theo', async () => {
    const original = await getAllData();
    const version = createStateVersion(original);
    const next = structuredClone(original);
    next.departments[0].name = 'Chỉ lưu sau khi DB hoạt động lại';
    await prisma.$executeRawUnsafe(`CREATE TRIGGER "integration_reject_assignment" BEFORE INSERT ON "Assignment"
      BEGIN SELECT RAISE(ABORT, 'integration forced failure'); END`);
    try {
      const rejected = await PUT(stateRequest('PUT', next, version));
      expect(rejected.status).toBe(500);
      await expect(getAllData()).resolves.toEqual(original);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER "integration_reject_assignment"');
    }
    const retried = await PUT(stateRequest('PUT', next, version));
    expect(retried.status).toBe(200);
    await expect(getAllData()).resolves.toEqual(next);
  });

  test('PUT trả version tái sử dụng được sau Prisma round trip', async () => {
    const firstGet = await GET(stateRequest('GET'));
    const next = await firstGet.json() as AppData;
    next.departments[0].name = 'Lưu lần 1';
    // A client or backup importer can change key order without changing the data.
    next.teachers = next.teachers.map((row) => Object.fromEntries(Object.entries(row).reverse()) as typeof row);
    const firstPut = await PUT(stateRequest('PUT', next, firstGet.headers.get('X-State-Version')!));
    expect(firstPut.status).toBe(200);
    const afterWrite = await GET(stateRequest('GET'));
    expect(firstPut.headers.get('X-State-Version')).toBe(afterWrite.headers.get('X-State-Version'));
    next.departments[0].name = 'Lưu lần 2';
    const secondPut = await PUT(stateRequest('PUT', next, firstPut.headers.get('X-State-Version')!));
    expect(secondPut.status).toBe(200);
  });

  test('hai instance API độc lập cùng version chỉ được commit một lần', async () => {
    const otherPrisma = new PrismaClient({ datasourceUrl: databaseUrl });
    let otherPut!: typeof PUT;
    jest.isolateModules(() => {
      jest.doMock('../db', () => ({ prisma: otherPrisma }));
      otherPut = require('../../app/api/state/route').PUT;
    });
    const current = await getAllData();
    const version = createStateVersion(current);
    const first = structuredClone(current);
    const second = structuredClone(current);
    first.departments[0].name = 'Worker A';
    second.departments[0].name = 'Worker B';
    try {
      const results = await Promise.all([
        PUT(stateRequest('PUT', first, version)),
        otherPut(stateRequest('PUT', second, version))
      ]);
      expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
      const winner = results[0].status === 200 ? first : second;
      await expect(getAllData()).resolves.toEqual(winner);
    } finally {
      await otherPrisma.$disconnect();
    }
  }, 30_000);
});
