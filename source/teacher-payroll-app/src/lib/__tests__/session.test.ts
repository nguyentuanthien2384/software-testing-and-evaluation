import { createSessionToken, readSessionUser, requirePermission, SESSION_COOKIE, verifySessionToken } from '../session';

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
    expect(verifySessionToken(token, 1_000 + 9 * 60 * 60 * 1000)).toBeNull();
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
