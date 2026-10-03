import { PUT as updateState } from '../../app/api/state/route';
import { POST as login } from '../../app/api/auth/login/route';
import { POST as logout } from '../../app/api/auth/logout/route';
import { GET as session } from '../../app/api/auth/session/route';
import { GET as payrollFormula, POST as calculatePayroll } from '../../app/api/payroll/route';
import { GET as stateData } from '../../app/api/state/route';
import { GET as teachers } from '../../app/api/teachers/route';
import { GET as reports } from '../../app/api/reports/route';
import { initialData } from '../initial-data';
import { createSessionToken, SESSION_COOKIE } from '../session';

function cookie(user: { username: string; displayName: string; role: 'admin' | 'tester' }) {
  return `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken(user))}`;
}

function payrollRequest(body: unknown) {
  return new Request('http://localhost/api/payroll', {
    method: 'POST',
    headers: {
      cookie: cookie({ username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' }),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

describe('bảo vệ API', () => {
  test.each([
    ['state', stateData], ['teachers', teachers], ['reports', reports], ['payroll', payrollFormula], ['auth/session', session]
  ])('GET /api/%s từ chối phiên hết hạn/bị sửa', async (path, handler) => {
    const user = { username: 'tester', displayName: 'Tester', role: 'tester' as const };
    const invalidTokens = [createSessionToken(user, Date.now() - 9 * 60 * 60 * 1000), `${createSessionToken(user)}.ignored`];
    for (const token of invalidTokens) {
      const response = await handler(new Request(`http://localhost/api/${path}`, {
        headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` }
      }));
      expect(response.status).toBe(401);
    }
  });

  test.each([['auth/session', session], ['payroll', payrollFormula]])(
    'GET /api/%s trả 503 khi cấu hình production secret không hợp lệ', async (path, handler) => {
      const request = new Request(`http://localhost/api/${path}`, {
        headers: { cookie: cookie({ username: 'tester', displayName: 'Tester', role: 'tester' }) }
      });
      const mutableEnv = process.env as Record<string, string | undefined>;
      const previousEnvironment = process.env.NODE_ENV;
      const previousSecret = process.env.AUTH_SESSION_SECRET;
      try {
        mutableEnv.NODE_ENV = 'production';
        process.env.AUTH_SESSION_SECRET = 'invalid';
        const response = await handler(request);
        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('AUTH_SESSION_SECRET') });
      } finally {
        if (previousEnvironment === undefined) delete mutableEnv.NODE_ENV;
        else mutableEnv.NODE_ENV = previousEnvironment;
        if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
        else process.env.AUTH_SESSION_SECRET = previousSecret;
      }
    }
  );
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
    const loginBody = await success.json();
    expect(loginBody.user).not.toHaveProperty('password');
    expect(loginBody).not.toHaveProperty('password');

    const failure = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'sai' })
    }));
    expect(failure.status).toBe(401);
    expect(failure.headers.get('set-cookie')).toBeNull();
  });

  test('phiên được đọc từ cookie; đăng xuất xóa cookie', async () => {
    const unauthenticated = await session(new Request('http://localhost/api/auth/session'));
    expect(unauthenticated.status).toBe(401);

    const authenticated = await session(new Request('http://localhost/api/auth/session', {
      headers: { cookie: cookie({ username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' }) }
    }));
    expect(authenticated.status).toBe(200);
    await expect(authenticated.json()).resolves.toEqual({
      user: { username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' }
    });

    const signedOut = await logout();
    expect(signedOut.status).toBe(200);
    expect(signedOut.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  test('đăng nhập qua HTTPS gắn cookie Secure', async () => {
    const response = await login(new Request('https://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin@123' })
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('; Secure');
  });

  test.each(['null', '[]', '{'])('đăng nhập từ chối JSON không phải đối tượng hợp lệ: %s', async (body) => {
    const response = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    }));
    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('production từ chối đăng nhập khi dùng secret demo và không cấp cookie', async () => {
    const mutableEnv = process.env as Record<string, string | undefined>;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecret = process.env.AUTH_SESSION_SECRET;
    try {
      mutableEnv.NODE_ENV = 'production';
      process.env.AUTH_SESSION_SECRET = 'change-this-secret';
      const response = await login(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin@123' })
      }));
      expect(response.status).toBe(503);
      expect(response.headers.get('set-cookie')).toBeNull();
      await expect(response.json()).resolves.toMatchObject({ ok: false, error: expect.stringContaining('AUTH_SESSION_SECRET') });
    } finally {
      if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
      else mutableEnv.NODE_ENV = previousNodeEnv;
      if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
      else process.env.AUTH_SESSION_SECRET = previousSecret;
    }
  });

  test('PUT state từ chối JSON hỏng với lỗi đầu vào', async () => {
    const response = await updateState(new Request('http://localhost/api/state', {
      method: 'PUT',
      headers: {
        cookie: cookie({ username: 'admin', displayName: 'Quản trị viên', role: 'admin' }),
        'Content-Type': 'application/json',
        'X-State-Version': 'version'
      },
      body: '{'
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Dữ liệu gửi lên không phải JSON hợp lệ.' });
  });

  test('API tính lương chấp nhận các chỉ số thập phân dương', async () => {
    const response = await calculatePayroll(payrollRequest({
      hours: '45',
      subjectCoef: '1.2',
      classCoef: '0.9',
      rate: 143000,
      degreeCoef: '2'
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      convertedHours: 48.6,
      amount: 13899600
    });
  });

  test('công thức tính lương chỉ hiển thị sau khi đăng nhập', async () => {
    const denied = await payrollFormula(new Request('http://localhost/api/payroll'));
    expect(denied.status).toBe(401);
    const allowed = await payrollFormula(new Request('http://localhost/api/payroll', {
      headers: { cookie: cookie({ username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' }) }
    }));
    expect(allowed.status).toBe(200);
    await expect(allowed.json()).resolves.toMatchObject({ formula: expect.stringContaining('Số tiết') });
  });

  test.each([
    ['số 0 ở số tiết', { hours: 0 }, 'Số tiết phải là số lớn hơn 0.'],
    ['số âm ở hệ số lớp', { classCoef: -0.1 }, 'Hệ số lớp phải là số lớn hơn 0.'],
    ['chuỗi hex ở định mức', { rate: '0x10' }, 'Định mức phải là số lớn hơn 0.'],
    ['ký pháp mũ ở hệ số bằng cấp', { degreeCoef: '1e2' }, 'Hệ số bằng cấp phải là số lớn hơn 0.'],
    ['boolean ở hệ số học phần', { subjectCoef: true }, 'Hệ số học phần phải là số lớn hơn 0.'],
    ['null ở hệ số lớp', { classCoef: null }, 'Hệ số lớp phải là số lớn hơn 0.'],
    [
      'tiết quy đổi tràn số',
      { hours: Number.MAX_VALUE, subjectCoef: 2, classCoef: 1, rate: 1, degreeCoef: 1 },
      'Tiết quy đổi phải là số lớn hơn 0.'
    ],
    [
      'tiết quy đổi underflow',
      { hours: Number.MIN_VALUE, subjectCoef: 0.1, classCoef: 1, rate: 1, degreeCoef: 1 },
      'Tiết quy đổi phải là số lớn hơn 0.'
    ],
    [
      'thành tiền tràn số',
      { hours: 1, subjectCoef: 1, classCoef: 1, rate: Number.MAX_VALUE, degreeCoef: 2 },
      'Thành tiền phải là số lớn hơn 0.'
    ],
    [
      'thành tiền làm tròn về 0',
      { hours: 1, subjectCoef: 1, classCoef: 1, rate: 0.49, degreeCoef: 1 },
      'Thành tiền phải là số lớn hơn 0.'
    ]
  ] as Array<[string, Record<string, unknown>, string]>)('API tính lương từ chối %s với đúng thông báo', async (_case, changed, expectedError) => {
    const response = await calculatePayroll(payrollRequest({
      hours: 45,
      subjectCoef: 1.2,
      classCoef: 0.9,
      rate: 143000,
      degreeCoef: 2,
      ...changed
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: expectedError });
  });
});
