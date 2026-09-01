export type Role = 'admin' | 'tester';

export type Permission =
  | 'data:view'
  | 'data:manage'
  | 'payroll:calculate'
  | 'reports:view'
  | 'system:reset';

export type AuthUser = {
  username: string;
  displayName: string;
  role: Role;
};

export type Account = AuthUser & {
  password: string;
};

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

/**
 * Ma trận phân quyền: mỗi vai trò được cấp những quyền nào.
 * - admin: toàn quyền (quản lý dữ liệu, tính tiền, báo cáo, reset hệ thống).
 * - tester: chỉ xem dữ liệu, chạy tính tiền và xem báo cáo để kiểm thử;
 *   KHÔNG được sửa dữ liệu hay reset hệ thống.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['data:view', 'data:manage', 'payroll:calculate', 'reports:view', 'system:reset'],
  tester: ['data:view', 'payroll:calculate', 'reports:view']
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  tester: 'Kiểm thử viên'
};

/**
 * Xác thực đăng nhập từ username/password.
 * Trả về kết quả tường minh để vừa dùng cho UI vừa dễ viết unit test.
 */
/** Kiểm tra một vai trò có quyền cụ thể hay không. */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Kiểm tra một người dùng (có thể null khi chưa đăng nhập) có quyền cụ thể hay không. */
export function userCan(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return roleHasPermission(user.role, permission);
}
