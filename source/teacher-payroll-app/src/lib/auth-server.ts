import { Account, LoginResult } from './auth';

/** Chỉ được import từ mã phía máy chủ để mật khẩu không bị đóng gói vào trình duyệt. */
export const ACCOUNTS: Account[] = [
  {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD ?? 'admin@123',
    displayName: 'Quản trị viên',
    role: 'admin'
  },
  {
    username: 'tester',
    password: process.env.TESTER_PASSWORD ?? 'tester@123',
    displayName: 'Kiểm thử viên',
    role: 'tester'
  }
];

export function authenticate(username: string, password: string): LoginResult {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || !password) {
    return { ok: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' };
  }

  const account = ACCOUNTS.find((item) => item.username === normalizedUsername);
  if (!account || account.password !== password) {
    return { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
  }

  return {
    ok: true,
    user: { username: account.username, displayName: account.displayName, role: account.role }
  };
}
