import { createSessionToken, expiredSessionCookie, readSessionUser, requirePermission, SESSION_COOKIE, SessionConfigurationError, sessionCookie, verifySessionToken } from '../session';

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
