/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../AppShell';
import LoginPage from '@/app/login/page';
import { useAuth } from '@/lib/use-auth';
import { usePathname, useRouter } from 'next/navigation';

jest.mock('@/lib/use-auth', () => ({ useAuth: jest.fn() }));
jest.mock('next/navigation', () => ({ usePathname: jest.fn(), useRouter: jest.fn() }));

const mockedUseAuth = jest.mocked(useAuth);
const mockedUsePathname = jest.mocked(usePathname);
const mockedUseRouter = jest.mocked(useRouter);
const replace = jest.fn();
const login = jest.fn();
const logout = jest.fn().mockResolvedValue(true);
const admin = { username: 'admin', displayName: 'Quản trị viên A', role: 'admin' as const };
const tester = { username: 'tester', displayName: 'Người kiểm thử', role: 'tester' as const };

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockedUseAuth.mockReturnValue({
    user: null, ready: true, login, logout, can: jest.fn(() => false), ...overrides
  } as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  jest.clearAllMocks();
  logout.mockResolvedValue(true);
  mockedUsePathname.mockReturnValue('/teachers');
  mockedUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  mockAuth();
});

test('giữ trang riêng trong khi khôi phục phiên và chuyển người chưa đăng nhập về login', async () => {
  mockAuth({ ready: false });
  const { rerender } = render(<AppShell><div data-testid="protected-content">Nội dung riêng</div></AppShell>);
  expect(screen.getByTestId('auth-loading')).not.toBeNull();
  expect(screen.queryByTestId('protected-content')).toBeNull();
  expect(replace).not.toHaveBeenCalled();

  mockAuth({ ready: true });
  rerender(<AppShell><div data-testid="protected-content">Nội dung riêng</div></AppShell>);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  expect(screen.queryByTestId('protected-content')).toBeNull();
});

test('trang login không hiển thị khung điều hướng', () => {
  mockedUsePathname.mockReturnValue('/login');
  render(<AppShell><div data-testid="login-content">Biểu mẫu</div></AppShell>);
  expect(screen.getByTestId('login-content')).not.toBeNull();
  expect(screen.queryByTestId('auth-loading')).toBeNull();
  expect(screen.queryByRole('navigation')).toBeNull();
});

test('tester không thấy mục hệ thống, menu di động tự đóng sau khi chọn trang', async () => {
  mockAuth({ user: tester, can: jest.fn((permission) => permission !== 'system:reset') });
  render(<AppShell><div>Nội dung</div></AppShell>);
  expect(screen.getByTestId('topbar-user-name').textContent).toBe(tester.displayName);
  expect(screen.queryByTestId('nav-system')).toBeNull();
  const menu = screen.getByRole('button', { name: 'Danh mục' });
  fireEvent.click(menu);
  expect(menu.getAttribute('aria-expanded')).toBe('true');
  screen.getByTestId('nav-payroll').addEventListener('click', (event) => event.preventDefault());
  fireEvent.click(screen.getByTestId('nav-payroll'));
  expect(menu.getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(screen.getByTestId('logout-button'));
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
});

test('admin thấy mục hệ thống và vai trò', () => {
  mockAuth({ user: admin, can: jest.fn(() => true) });
  render(<AppShell><div>Nội dung</div></AppShell>);
  expect(screen.getByTestId('nav-system').getAttribute('href')).toBe('/system');
  expect(screen.getByTestId('topbar-user-role').textContent).toBe('Quản trị viên');
});

test('đăng xuất lỗi giữ người dùng trên trang và cho phép thử lại', async () => {
  logout.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mockAuth({ user: admin, can: jest.fn(() => true) });
  render(<AppShell><div data-testid="protected-content">Nội dung riêng</div></AppShell>);

  fireEvent.click(screen.getByTestId('logout-button'));
  await waitFor(() => expect(screen.getByTestId('logout-error').textContent).toContain('Không thể đăng xuất'));
  expect(screen.getByTestId('protected-content')).not.toBeNull();
  expect(replace).not.toHaveBeenCalled();

  fireEvent.click(screen.getByTestId('logout-button'));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  expect(screen.queryByTestId('logout-error')).toBeNull();
});

test('login hiển thị lỗi, cho sửa thông tin và điều hướng sau khi thành công', async () => {
  login.mockResolvedValueOnce({ ok: false, error: 'Sai tài khoản hoặc mật khẩu.' }).mockResolvedValueOnce({ ok: true, user: admin });
  render(<LoginPage />);
  const username = screen.getByTestId('login-username') as HTMLInputElement;
  const password = screen.getByTestId('login-password') as HTMLInputElement;
  expect(username.required).toBe(true);
  expect(password.required).toBe(true);

  fireEvent.change(username, { target: { value: 'admin' } });
  fireEvent.change(password, { target: { value: 'wrong' } });
  fireEvent.submit(screen.getByTestId('login-form'));
  await waitFor(() => expect(screen.getByTestId('login-error').textContent).toBe('Sai tài khoản hoặc mật khẩu.'));
  expect(replace).not.toHaveBeenCalled();

  fireEvent.change(password, { target: { value: 'correct' } });
  expect(screen.queryByTestId('login-error')).toBeNull();
  fireEvent.submit(screen.getByTestId('login-form'));
  await waitFor(() => expect(login).toHaveBeenCalledWith('admin', 'correct'));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
});

test('người đã đăng nhập được chuyển khỏi trang login', async () => {
  mockAuth({ user: admin });
  render(<LoginPage />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
});
