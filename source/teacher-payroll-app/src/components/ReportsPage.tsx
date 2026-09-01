'use client';

import { useMemo, useState } from 'react';
import { calculateAllPayrollLinesSafely, formatCurrency, groupAmountBy, sumAmount } from '@/lib/payroll';
import { useAppData } from '@/lib/use-app-data';
import { buildPayrollCsv } from '@/lib/report-export';
import { StatCard } from './StatCard';

export function ReportsPage() {
  const { data } = useAppData();
  const [year, setYear] = useState('');
  const [department, setDepartment] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const { lines, errors: calculationErrors } = calculateAllPayrollLinesSafely(data);
  const departments = Array.from(new Set(lines.map((line) => line.departmentName)));
  const years = Array.from(new Set(lines.map((line) => line.year)));

  const filtered = useMemo(
    () => lines.filter((line) => (!year || line.year === year) && (!department || line.departmentName === department) && (!teacherId || line.teacherId === teacherId)),
    [lines, year, department, teacherId]
  );

  const byTeacher = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number }>();
    for (const line of filtered) {
      const current = totals.get(line.teacherId) ?? { name: `${line.teacherId} - ${line.teacherName}`, amount: 0 };
      current.amount += line.amount;
      totals.set(line.teacherId, current);
    }
    return Array.from(totals.entries()).map(([id, item]) => ({ id, ...item })).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  function exportCsv() {
    const blob = new Blob([buildPayrollCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bao-cao-tien-day.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page" data-testid="reports-page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">UC4.1 - UC4.3</p>
          <h1>Báo cáo tiền dạy</h1>
          <p>Báo cáo theo giáo viên trong năm, theo khoa và toàn trường.</p>
        </div>
        <div className="actions">
          <button className="ghost-btn" data-testid="reports-print-button" type="button" onClick={() => window.print()}>In / lưu PDF</button>
          <button className="primary-btn" data-testid="reports-export-csv-button" type="button" onClick={exportCsv}>Xuất CSV</button>
        </div>
      </div>

      {calculationErrors.length > 0 && (
        <section className="panel error-message" role="alert">
          Báo cáo đã bỏ qua {calculationErrors.length} phân công do thiếu hoặc sai cấu hình: {calculationErrors.join(' ')}
        </section>
      )}

      <section className="stat-grid">
        <StatCard title="Số dòng báo cáo" value={filtered.length} />
        <StatCard title="Tổng tiền" value={formatCurrency(sumAmount(filtered))} />
        <StatCard title="Số giáo viên" value={new Set(filtered.map((line) => line.teacherId)).size} />
        <StatCard title="Số khoa" value={new Set(filtered.map((line) => line.departmentName)).size} />
      </section>

      <section className="panel">
        <div className="toolbar start">
          <select data-testid="reports-year-filter" value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">Tất cả năm học</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select data-testid="reports-department-filter" value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="">Tất cả khoa</option>
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select data-testid="reports-teacher-filter" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="">Tất cả giáo viên</option>
            {data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.id} - {teacher.fullName}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table data-testid="reports-table">
            <thead><tr><th>Giáo viên</th><th>Khoa</th><th>Năm học</th><th>Lớp</th><th>Học phần</th><th>Tiết quy đổi</th><th>Thành tiền</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7}>Không có dữ liệu báo cáo.</td></tr>}
              {filtered.map((line) => (
                <tr key={line.assignmentId}>
                  <td>{line.teacherId} - {line.teacherName}</td>
                  <td>{line.departmentName}</td>
                  <td>{line.year}</td>
                  <td>{line.classCode}</td>
                  <td>{line.subjectName}</td>
                  <td>{line.convertedHours}</td>
                  <td>{formatCurrency(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>Tổng hợp theo giáo viên</h2>
          <ul className="summary-list">
            {byTeacher.map((item) => <li key={item.id}><span>{item.name}</span><strong>{formatCurrency(item.amount)}</strong></li>)}
          </ul>
        </div>
        <div className="panel">
          <h2>Tổng hợp theo khoa</h2>
          <ul className="summary-list">
            {groupAmountBy(filtered, 'departmentName').map((item) => <li key={item.name}><span>{item.name}</span><strong>{formatCurrency(item.amount)}</strong></li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}
