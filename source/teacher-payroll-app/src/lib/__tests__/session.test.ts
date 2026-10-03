import { createSessionToken, expiredSessionCookie, readSessionUser, requirePermission, SESSION_COOKIE, SessionConfigurationError, sessionCookie, verifySessionToken } from '../session';
import { createHmac } from 'node:crypto';

const admin = { username: 'admin', displayName: 'Quản trị viên', role: 'admin' as const };
const tester = { username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' as const };

function requestWithToken(token?: string) {
  return new Request('http://localhost/api/state', {
    headers: token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : undefined
  });
}

describe('phiên đăng nhập phía máy chủ', () => {
  test('đọc lại đúng người dùng từ token hợp lệ', () => {
    const token = createSessionToken(admin, 1_000);
    expect(verifySessionToken(token, 2_000)).toEqual(admin);
  });

  test('từ chối token đã bị sửa', () => {
    const token = createSessionToken(admin);
    expect(verifySessionToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  test.each(['.', '..ignored', '.unexpected', '...'])('từ chối token có phần thừa %s', (suffix) => {
    expect(verifySessionToken(`${createSessionToken(admin)}${suffix}`)).toBeNull();
  });

  test('từ chối token hết hạn', () => {
    const token = createSessionToken(admin, 1_000);
    expect(verifySessionToken(token, 1_000 + 8 * 60 * 60 * 1000 - 1)).toEqual(admin);
    expect(verifySessionToken(token, 1_000 + 8 * 60 * 60 * 1000)).toBeNull();
    expect(verifySessionToken(token, 1_000 + 9 * 60 * 60 * 1000)).toBeNull();
  });

  test('cookie mã hóa URL sai bị coi là không có phiên thay vì ném lỗi', () => {
    const request = new Request('http://localhost/api/state', {
      headers: { cookie: `${SESSION_COOKIE}=%E0%A4%A` }
    });
    expect(readSessionUser(request)).toBeNull();
    const denied = requirePermission(request, 'data:view');
    expect(denied).toBeInstanceOf(Response);
    if (denied instanceof Response) expect(denied.status).toBe(401);
  });

  test.each(['', 'only-payload', '.', 'payload.signature.extra'])('token sai cấu trúc bị từ chối: %j', (token) => {
    expect(verifySessionToken(token)).toBeNull();
  });

  test.each([
    '{broken-json',
    'null',
    JSON.stringify({ ...admin, expiresAt: 'tomorrow' }),
    JSON.stringify({ ...admin, expiresAt: Number.MAX_SAFE_INTEGER, role: 'superadmin' }),
    JSON.stringify({ ...admin, expiresAt: Number.MAX_SAFE_INTEGER, username: 123 }),
    JSON.stringify({ ...admin, expiresAt: Number.MAX_SAFE_INTEGER, displayName: null })
  ])('payload có chữ ký đúng nhưng JSON/schema sai vẫn bị từ chối: %j', (payload) => {
    const previousSecret = process.env.AUTH_SESSION_SECRET;
    try {
      process.env.AUTH_SESSION_SECRET = 'test-only-secret-for-invalid-payloads';
      const encoded = Buffer.from(payload).toString('base64url');
      const signature = createHmac('sha256', process.env.AUTH_SESSION_SECRET).update(encoded).digest('base64url');
      expect(verifySessionToken(`${encoded}.${signature}`)).toBeNull();
    } finally {
      if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
      else process.env.AUTH_SESSION_SECRET = previousSecret;
    }
  });

  test('đổi secret vô hiệu hóa token cũ', () => {
    const previousSecret = process.env.AUTH_SESSION_SECRET;
    try {
      process.env.AUTH_SESSION_SECRET = 'test-only-original-session-secret';
      const token = createSessionToken(admin);
      process.env.AUTH_SESSION_SECRET = 'test-only-rotated-session-secret';
      expect(verifySessionToken(token)).toBeNull();
      expect(verifySessionToken(createSessionToken(admin))).toEqual(admin);
    } finally {
      if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
      else process.env.AUTH_SESSION_SECRET = previousSecret;
    }
  });

  test('đọc đúng cookie giữa các cookie khác và bỏ qua mục không có dấu bằng', () => {
    const token = createSessionToken(tester);
    const request = new Request('http://localhost/api/state', {
      headers: { cookie: `unrelated=1; malformed; ${SESSION_COOKIE}=${encodeURIComponent(token)}; tail=2` }
    });
    expect(readSessionUser(request)).toEqual(tester);
  });

  test('cookie phiên dùng HttpOnly và chỉ gắn Secure trên HTTPS', () => {
    const token = createSessionToken(admin);
    expect(sessionCookie(token)).toContain('HttpOnly; SameSite=Lax; Path=/; Max-Age=28800');
    expect(sessionCookie(token)).not.toContain('; Secure');
    expect(sessionCookie(token, true)).toContain('; Secure');
    expect(expiredSessionCookie()).toContain('Max-Age=0');
  });

  test('production chỉ chấp nhận secret riêng đủ dài', () => {
    const mutableEnv = process.env as Record<string, string | undefined>;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecret = process.env.AUTH_SESSION_SECRET;
    try {
      mutableEnv.NODE_ENV = 'production';
      for (const secret of [undefined, '', 'change-this-secret', 'too-short']) {
        if (secret === undefined) delete process.env.AUTH_SESSION_SECRET;
        else process.env.AUTH_SESSION_SECRET = secret;
        expect(() => createSessionToken(admin)).toThrow(SessionConfigurationError);
      }
      process.env.AUTH_SESSION_SECRET = 'unique-production-secret-with-at-least-32-chars';
      expect(verifySessionToken(createSessionToken(admin))).toEqual(admin);
    } finally {
      if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
      else mutableEnv.NODE_ENV = previousNodeEnv;
      if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
      else process.env.AUTH_SESSION_SECRET = previousSecret;
    }
  });

  test('request không có cookie không được xác thực', () => {
    expect(readSessionUser(requestWithToken())).toBeNull();
    const response = requirePermission(requestWithToken(), 'data:view');
    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) expect(response.status).toBe(401);
  });

  test('tester xem được dữ liệu nhưng không được ghi', () => {
    const request = requestWithToken(createSessionToken(tester));
    expect(requirePermission(request, 'data:view')).toEqual(tester);
    const response = requirePermission(request, 'data:manage');
    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) expect(response.status).toBe(403);
  });
});
