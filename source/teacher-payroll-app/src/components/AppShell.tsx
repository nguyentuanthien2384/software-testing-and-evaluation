'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Permission } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/auth';
import { useAuth } from '@/lib/use-auth';

type NavItem = { href: string; label: string; permission?: Permission };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ href: '/', label: 'Trang chủ' }]
  },
  {
    title: 'Quản lý giáo viên',
    items: [
      { href: '/teachers', label: 'Giáo viên' },
      { href: '/departments', label: 'Khoa' },
      { href: '/degrees', label: 'Bằng cấp' },
      { href: '/teacher-statistics', label: 'Thống kê GV' }
    ]
  },
  {
    title: 'Quản lý lớp học phần',
    items: [
      { href: '/subjects', label: 'Học phần' },
      { href: '/semesters', label: 'Kỳ học' },
      { href: '/classes', label: 'Lớp học phần' },
      { href: '/assignments', label: 'Phân công GV' }
    ]
  },
  {
    title: 'Tính tiền dạy',
    items: [
      { href: '/payment-rates', label: 'Định mức tiết' },
      { href: '/teacher-coefficients', label: 'Hệ số giáo viên' },
      { href: '/class-coefficients', label: 'Hệ số lớp' },
      { href: '/payroll', label: 'Tính tiền dạy' }
    ]
  },
  {
    title: 'Báo cáo',
    items: [
      { href: '/reports', label: 'Báo cáo tiền dạy' },
      { href: '/system', label: 'Hệ thống', permission: 'system:reset' }
    ]
  }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, can, logout } = useAuth();

  const isLoginRoute = pathname === '/login';

  // Chưa đăng nhập mà vào trang nội bộ -> chuyển hướng về /login.
  useEffect(() => {
    if (ready && !user && !isLoginRoute) {
      router.replace('/login');
    }
  }, [ready, user, isLoginRoute, router]);

  // Trang đăng nhập không hiển thị sidebar/topbar.
  if (isLoginRoute) {
    return <>{children}</>;
  }

  // Đang khôi phục phiên hoặc đang chờ điều hướng -> hiển thị trạng thái chờ.
  if (!ready || !user) {
    return (
      <div className="auth-loading" data-testid="auth-loading">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <div>
            <strong>Hệ thống Quản lý</strong>
            <span>Tiền dạy giáo viên</span>
          </div>
        </div>
        <nav>
          {navGroups.map((group) => {
            const items = group.items.filter((item) => !item.permission || can(item.permission));
            if (items.length === 0) return null;
            return (
              <section className="nav-group" key={group.title}>
                <h3>{group.title}</h3>
                {items.map((item) => (
                  <Link className={pathname === item.href ? 'nav-item active' : 'nav-item'} data-testid={`nav-${item.href === '/' ? 'home' : item.href.slice(1).replaceAll('/', '-')}`} href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </section>
            );
          })}
        </nav>
        <div className="version">v3.0.0</div>
      </aside>
      <div className="content-area">
        <header className="topbar">
          <div className="topbar-user" data-testid="topbar-user">
            <strong data-testid="topbar-user-name">{user.displayName}</strong>
            <span data-testid="topbar-user-role">{ROLE_LABELS[user.role]}</span>
          </div>
          <button className="ghost-btn logout-btn" data-testid="logout-button" type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
