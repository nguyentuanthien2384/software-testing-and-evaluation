import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('SQLite setup before Prisma migrations', () => {
  test('creates a missing database file and preserves an existing one', () => {
    const appDir = path.resolve(__dirname, '../../..');
    const name = `qa-setup-${process.pid}-${Date.now()}.db`;
    const databasePath = path.join(appDir, 'prisma', name);
    const runSetup = () => spawnSync(process.execPath, ['scripts/ensure-sqlite-db.mjs'], {
      cwd: appDir,
      env: { ...process.env, DATABASE_URL: `file:./${name}` },
      encoding: 'utf8'
    });

    expect(existsSync(databasePath)).toBe(false);
    try {
      expect(runSetup().status).toBe(0);
      expect(existsSync(databasePath)).toBe(true);
      writeFileSync(databasePath, 'existing data');
      expect(runSetup().status).toBe(0);
      expect(readFileSync(databasePath, 'utf8')).toBe('existing data');
    } finally {
      if (existsSync(databasePath)) unlinkSync(databasePath);
    }
  });
});
