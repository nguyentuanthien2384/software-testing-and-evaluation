import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthUser, Permission, userCan } from './auth';

export const SESSION_COOKIE = 'teacher_payroll_session';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type SessionPayload = AuthUser & { expiresAt: number };

function getSecret(): string {
  return process.env.AUTH_SESSION_SECRET ?? 'n01-g11-dev-session-secret-change-in-production';
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createSessionToken(user: AuthUser, now = Date.now()): string {
  const payload: SessionPayload = {
    ...user,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string, now = Date.now()): AuthUser | null {
  const [encoded, receivedSignature, extra] = token.split('.');
  if (!encoded || !receivedSignature || extra) return null;

  const expectedSignature = sign(encoded);
  const actualBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (
      payload.expiresAt === undefined || payload.expiresAt <= now ||
      typeof payload.username !== 'string' || typeof payload.displayName !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'tester')
    ) return null;
    return { username: payload.username, displayName: payload.displayName, role: payload.role };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie') ?? '';
  for (const entry of cookies.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name) {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    }
  }
  return null;
}

export function readSessionUser(request: Request): AuthUser | null {
  const token = readCookie(request, SESSION_COOKIE);
  return token ? verifySessionToken(token) : null;
}

export function sessionCookie(token: string, useSecureCookie = false): string {
  const secure = useSecureCookie ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function requirePermission(request: Request, permission: Permission): AuthUser | Response {
  const user = readSessionUser(request);
  if (!user) {
    return Response.json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này.' }, { status: 401 });
  }
  if (!userCan(user, permission)) {
    return Response.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }
  return user;
}
