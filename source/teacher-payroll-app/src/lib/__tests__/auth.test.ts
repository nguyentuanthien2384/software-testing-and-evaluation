import {
  ACCOUNTS,
  authenticate,
  roleHasPermission,
  ROLE_PERMISSIONS,
  userCan
} from '../auth';

describe('authenticate - đăng nhập', () => {
  test('TC01 - admin đăng nhập đúng', () => {
    const result = authenticate('admin', 'admin@123');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.role).toBe('admin');
      expect(result.user.displayName).toBe('Quản trị viên');
    }
  });

  test('TC02 - tester đăng nhập đúng', () => {
    const result = authenticate('tester', 'tester@123');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.role).toBe('tester');
  });

  test('TC03 - tên đăng nhập không phân biệt hoa/thường và có khoảng trắng thừa', () => {
    const result = authenticate('  ADMIN  ', 'admin@123');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.username).toBe('admin');
  });

  test('TC04 - sai mật khẩu', () => {
    const result = authenticate('admin', 'sai-mat-khau');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Tên đăng nhập hoặc mật khẩu không đúng.');
  });

  test('TC05 - tài khoản không tồn tại', () => {
    const result = authenticate('khong-ton-tai', 'bat-ky');
    expect(result.ok).toBe(false);
  });

  test('TC06 - bỏ trống tên đăng nhập', () => {
    const result = authenticate('', 'admin@123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
  });

  test('TC07 - bỏ trống mật khẩu', () => {
    const result = authenticate('admin', '');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
  });

  test('TC08 - mật khẩu phân biệt hoa/thường', () => {
    expect(authenticate('admin', 'ADMIN@123').ok).toBe(false);
  });

  test('TC09 - chỉ có đúng 2 tài khoản demo', () => {
    expect(ACCOUNTS).toHaveLength(2);
    expect(ACCOUNTS.map((account) => account.username).sort()).toEqual(['admin', 'tester']);
  });
});

describe('phân quyền theo vai trò', () => {
  test('TC10 - admin có toàn quyền', () => {
    expect(roleHasPermission('admin', 'data:view')).toBe(true);
    expect(roleHasPermission('admin', 'data:manage')).toBe(true);
    expect(roleHasPermission('admin', 'payroll:calculate')).toBe(true);
    expect(roleHasPermission('admin', 'reports:view')).toBe(true);
    expect(roleHasPermission('admin', 'system:reset')).toBe(true);
  });

  test('TC11 - tester chỉ xem và kiểm thử, không sửa dữ liệu/không reset', () => {
    expect(roleHasPermission('tester', 'data:view')).toBe(true);
    expect(roleHasPermission('tester', 'payroll:calculate')).toBe(true);
    expect(roleHasPermission('tester', 'reports:view')).toBe(true);
    expect(roleHasPermission('tester', 'data:manage')).toBe(false);
    expect(roleHasPermission('tester', 'system:reset')).toBe(false);
  });

  test('TC12 - userCan trả về false khi chưa đăng nhập', () => {
    expect(userCan(null, 'data:view')).toBe(false);
    expect(userCan(null, 'data:manage')).toBe(false);
  });

  test('TC13 - userCan đúng theo người dùng đã đăng nhập', () => {
    const admin = { username: 'admin', displayName: 'Quản trị viên', role: 'admin' as const };
    const tester = { username: 'tester', displayName: 'Kiểm thử viên', role: 'tester' as const };
    expect(userCan(admin, 'data:manage')).toBe(true);
    expect(userCan(tester, 'data:manage')).toBe(false);
  });

  test('TC14 - admin có nhiều quyền hơn tester', () => {
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.tester.length);
  });
});
