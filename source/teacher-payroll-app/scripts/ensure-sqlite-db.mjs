import { closeSync, existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schemaDir = path.join(appDir, 'prisma');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(appDir, '.env');
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((item) => /^\s*DATABASE_URL\s*=/.test(item));
  const match = line?.match(/^\s*DATABASE_URL\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

const url = databaseUrl();
if (url?.startsWith('file:')) {
  const configuredPath = url.slice('file:'.length).split('?')[0];
  if (!configuredPath) throw new Error('DATABASE_URL must contain a SQLite file path.');
  const filePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(schemaDir, configuredPath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  if (!existsSync(filePath)) closeSync(openSync(filePath, 'wx'));
}
