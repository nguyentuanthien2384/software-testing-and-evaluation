'use client';

import Link from 'next/link';
import { calculateAllPayrollLines, formatCurrency, sumAmount } from '@/lib/payroll';
import { useAppData } from '@/lib/use-app-data';
import { StatCard } from './StatCard';

export function HomeDashboard() {
  const { data } = useAppData();
  const payrollLines = calculateAllPayrollLines(data);
  const totalAmount = sumAmount(payrollLines);

  return (
    <main className="page" data-testid="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">N01 - Nhóm 11</p>
          <h1>Phần mềm tính tiền dạy cho giáo viên</h1>
          <p>Quản lý danh mục, phân công giảng dạy, tính tiền dạy và xuất báo cáo theo đặc tả dự án.</p>
        </div>
        <Link className="primary-btn" data-testid="dashboard-payroll-link" href="/payroll">Tính tiền dạy</Link>
      </div>

      <section className="stat-grid">
        <StatCard title="Giáo viên" value={data.teachers.length} note="Hồ sơ đang quản lý" />
        <StatCard title="Lớp học phần" value={data.classes.length} note="Theo các kỳ học" />
        <StatCard title="Phân công" value={data.assignments.length} note="Luồng tính tiền" />
        <StatCard title="Tổng tiền mẫu" value={formatCurrency(totalAmount)} note="Tính từ dữ liệu demo" />
      </section>

      <section className="panel two-column">
        <div>
          <h2>Luồng nghiệp vụ chính</h2>
          <ol className="timeline">
            <li>Thiết lập bằng cấp, khoa, giảng viên.</li>
            <li>Thiết lập học phần, kỳ học, lớp học phần.</li>
            <li>Phân công giảng viên và nhập số tiết.</li>
            <li>Thiết lập định mức, hệ số bằng cấp, hệ số lớp.</li>
            <li>Tính tiền dạy và xuất báo cáo.</li>
          </ol>
        </div>
        <div>
          <h2>Công thức tính</h2>
          <div className="formula-box">Tiền dạy mỗi lớp = Số tiết × (Hệ số học phần + Hệ số lớp) × Định mức × Hệ số bằng cấp</div>
          <p className="muted">Công thức được dùng thống nhất trong màn hình tính tiền, báo cáo và unit test.</p>
        </div>
      </section>
    </main>
  );
}
