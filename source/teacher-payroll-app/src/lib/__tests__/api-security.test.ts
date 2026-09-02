import { PUT as updateState } from '../../app/api/state/route';
import { POST as login } from '../../app/api/auth/login/route';
import { initialData } from '../initial-data';
import { createSessionToken, SESSION_COOKIE } from '../session';

function cookie(user: { username: string; displayName: string; role: 'admin' | 'tester' }) {
  return `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken(user))}`;
}

describe('bảo vệ API', () => {
  test('không cho người chưa đăng nhập ghi đè dữ liệu', async () => {
    const response = await updateState(new Request('http://localhost/api/state', {
      method: 'PUT',
      body: JSON.stringify({})
    }));
    expect(response.status).toBe(401);
  });

  test('tester không có quyền ghi đè dữ liệu', async () => {
    const response = await updateState(new Request('http://localhost/api/state', {
      method: 'PUT',
      headers: {
        cookie: cookie({ username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }));
    expect(response.status).toBe(403);
  });

  test('admin vẫn bị chặn khi payload sai cấu trúc', async () => {
    const response = await updateState(new Request('http://localhost/api/state', {
      method: 'PUT',
      headers: {
        cookie: cookie({ username: 'admin', displayName: 'Quản trị viên', role: 'admin' }),
        'Content-Type': 'application/json',
        'X-State-Version': 'version'
      },
      body: JSON.stringify({})
    }));
    expect(response.status).toBe(400);
  });

  test('payload có bản ghi null trả 400 thay vì lỗi máy chủ', async () => {
    const data = structuredClone(initialData);
    (data.degrees as unknown[])[0] = null;
    const response = await updateState(new Request('http://localhost/api/state', {
      method: 'PUT',
      headers: {
        cookie: cookie({ username: 'admin', displayName: 'Quản trị viên', role: 'admin' }),
        'Content-Type': 'application/json',
        'X-State-Version': 'version'
      },
      body: JSON.stringify(data)
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'degrees[0] không phải là một bản ghi hợp lệ.'
    });
  });

  test('đăng nhập đúng trả cookie HttpOnly, sai không trả phiên', async () => {
    const success = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin@123' })
    }));
    expect(success.status).toBe(200);
    expect(success.headers.get('set-cookie')).toContain('HttpOnly');

    const failure = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'sai' })
    }));
    expect(failure.status).toBe(401);
    expect(failure.headers.get('set-cookie')).toBeNull();
  });
});
