'use client';

import { useMemo, useState } from 'react';
import { calculateAllPayrollLines, formatCurrency, groupAmountBy, sumAmount } from '@/lib/payroll';
import { useAppData } from '@/lib/use-app-data';
import { StatCard } from './StatCard';

export function ReportsPage() {
  const { data } = useAppData();
  const [year, setYear] = useState('');
  const [department, setDepartment] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const lines = calculateAllPayrollLines(data);
  const departments = Array.from(new Set(lines.map((line) => line.departmentName)));
  const years = Array.from(new Set(lines.map((line) => line.year)));

  const filtered = useMemo(
    () => lines.filter((line) => (!year || line.year === year) && (!department || line.departmentName === department) && (!teacherId || line.teacherId === teacherId)),
    [lines, year, department, teacherId]
  );

  function exportCsv() {
    const header = ['Ma GV', 'Giao vien', 'Khoa', 'Nam hoc', 'Lop', 'Hoc phan', 'So tiet', 'Tien day'];
    const body = filtered.map((line) => [line.teacherId, line.teacherName, line.departmentName, line.year, line.classCode, line.subjectName, line.teachingHours, line.amount]);
    const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
        <button className="primary-btn" data-testid="reports-export-csv-button" type="button" onClick={exportCsv}>Xuất CSV</button>
      </div>

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
            {groupAmountBy(filtered, 'teacherName').map((item) => <li key={item.name}><span>{item.name}</span><strong>{formatCurrency(item.amount)}</strong></li>)}
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
