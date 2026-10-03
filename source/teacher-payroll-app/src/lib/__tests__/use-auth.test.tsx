/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../use-auth';

const admin = { username: 'admin', displayName: 'Quản trị viên', role: 'admin' as const };
const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function mockResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

test('khôi phục phiên, phân quyền và hoàn tất trạng thái chờ', async () => {
  fetchMock.mockResolvedValueOnce(mockResponse({ user: admin }));
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.user).toEqual(admin);
  expect(hook.result.current.can('data:manage')).toBe(true);
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', { cache: 'no-store' });
});

test.each([
  { username: 'admin', displayName: 'Admin', role: 'unknown' },
  { username: 'admin', role: 'admin' },
  { username: 1, displayName: 'Admin', role: 'admin' },
  'admin'
])('phản hồi phiên sai cấu trúc không được tạo trạng thái đăng nhập: %p', async (user) => {
  fetchMock.mockResolvedValueOnce(mockResponse({ user }));
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.can('data:view')).toBe(false);
});

test('phiên hết hạn đưa người dùng về trạng thái chưa đăng nhập', async () => {
  fetchMock.mockResolvedValueOnce(mockResponse({ user: null }, 401));
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.can('data:view')).toBe(false);
});

test('đăng nhập thành công không bị phản hồi phiên cũ tới chậm ghi đè', async () => {
  let finishSession!: (response: Response) => void;
  fetchMock
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishSession = resolve; }))
    .mockResolvedValueOnce(mockResponse({ ok: true, user: admin }));
  const hook = renderHook(() => useAuth(), { wrapper });
  let loginResult: Awaited<ReturnType<typeof hook.result.current.login>> | undefined;
  await act(async () => {
    loginResult = await hook.result.current.login('admin', 'password');
  });
  expect(loginResult).toEqual({ ok: true, user: admin });
  expect(hook.result.current.user).toEqual(admin);
  expect(hook.result.current.ready).toBe(true);

  await act(async () => {
    finishSession(mockResponse({ user: null }, 401));
  });
  expect(hook.result.current.user).toEqual(admin);
});

test('lỗi HTTP hoặc phản hồi đăng nhập hỏng không tạo phiên cục bộ', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse({ user: null }, 401))
    .mockResolvedValueOnce(mockResponse({ ok: true, user: admin }, 401))
    .mockResolvedValueOnce(mockResponse({ ok: true, user: { ...admin, role: 'unknown' } }));
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(async () => {
    expect(await hook.result.current.login('admin', 'wrong')).toMatchObject({ ok: false });
    expect(await hook.result.current.login('admin', 'wrong')).toEqual({
      ok: false, error: 'Phản hồi đăng nhập không hợp lệ.'
    });
  });
  expect(hook.result.current.user).toBeNull();
});

test('giữ thông báo đăng nhập từ máy chủ và báo lỗi kết nối khi không thể gửi yêu cầu', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse({ user: null }, 401))
    .mockResolvedValueOnce(mockResponse({ ok: false, error: 'Sai mật khẩu.' }, 401))
    .mockRejectedValueOnce(new Error('offline'));
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(async () => {
    expect(await hook.result.current.login('admin', 'wrong')).toEqual({ ok: false, error: 'Sai mật khẩu.' });
    expect(await hook.result.current.login('admin', 'wrong')).toEqual({
      ok: false, error: 'Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.'
    });
  });
  expect(hook.result.current.user).toBeNull();
});

test('logout lỗi HTTP hoặc mất mạng giữ phiên; logout thành công mới xoá user', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse({ user: admin }))
    .mockResolvedValueOnce(mockResponse({ ok: false }, 500))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(mockResponse({ ok: true }));
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(async () => { expect(await hook.result.current.logout()).toBe(false); });
  expect(hook.result.current.user).toEqual(admin);
  await act(async () => { expect(await hook.result.current.logout()).toBe(false); });
  expect(hook.result.current.user).toEqual(admin);
  await act(async () => { expect(await hook.result.current.logout()).toBe(true); });
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.can('data:view')).toBe(false);
});
