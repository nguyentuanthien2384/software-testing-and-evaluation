'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const navGroups = [
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
      { href: '/system', label: 'Hệ thống' }
    ]
  }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
          {navGroups.map((group) => (
            <section className="nav-group" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((item) => (
                <Link className={pathname === item.href ? 'nav-item active' : 'nav-item'} data-testid={`nav-${item.href === '/' ? 'home' : item.href.slice(1).replaceAll('/', '-')}`} href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </section>
          ))}
        </nav>
        <div className="version">v3.0.0</div>
      </aside>
      <div className="content-area">
        <header className="topbar">
          <div>
            <strong>Admin</strong>
            <span>Quản trị viên</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
