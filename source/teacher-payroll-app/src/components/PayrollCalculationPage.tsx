'use client';

import { useMemo, useState } from 'react';
import { calculateAllPayrollLines, calculateTeachingPay, formatCurrency } from '@/lib/payroll';
import { useAppData } from '@/lib/use-app-data';

export function PayrollCalculationPage() {
  const { data } = useAppData();
  const lines = calculateAllPayrollLines(data);
  const [teacherId, setTeacherId] = useState(data.teachers[0]?.id ?? '');
  const [year, setYear] = useState('');
  const [manual, setManual] = useState({ hours: 45, subjectCoef: 1, classCoef: 0, rate: 143000, degreeCoef: 1.5 });

  const filtered = useMemo(
    () => lines.filter((line) => (!teacherId || line.teacherId === teacherId) && (!year || line.year === year)),
    [lines, teacherId, year]
  );
  const manualResult = calculateTeachingPay(manual);
  const total = filtered.reduce((sum, line) => sum + line.amount, 0);
  const years = Array.from(new Set(data.semesters.map((semester) => semester.year)));

  return (
    <main className="page" data-testid="payroll-page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">UC3.4</p>
          <h1>Tính tiền dạy</h1>
          <p>Tính tiền dạy theo phân công giảng viên và công thức đã nêu trong đặc tả.</p>
        </div>
      </div>

      <section className="grid-2">
        <div className="panel">
          <h2>Tính theo dữ liệu phân công</h2>
          <div className="toolbar start">
            <select data-testid="payroll-teacher-filter" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">Tất cả giáo viên</option>
              {data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.id} - {teacher.fullName}</option>)}
            </select>
            <select data-testid="payroll-year-filter" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="">Tất cả năm học</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="table-wrapper">
            <table data-testid="payroll-calculated-table">
              <thead><tr><th>Lớp</th><th>Học phần</th><th>Tiết</th><th>Hệ số HP</th><th>Hệ số lớp</th><th>Hệ số GV</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7}>Không có dữ liệu tính tiền.</td></tr>}
                {filtered.map((line) => (
                  <tr key={line.assignmentId}>
                    <td>{line.classCode}</td>
                    <td>{line.subjectName}</td>
                    <td>{line.teachingHours}</td>
                    <td>{line.subjectCoefficient}</td>
                    <td>{line.classCoefficient}</td>
                    <td>{line.degreeCoefficient}</td>
                    <td>{formatCurrency(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={6}>Tổng</td><td>{formatCurrency(total)}</td></tr></tfoot>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Tính thử thủ công</h2>
          <form className="form-grid" data-testid="payroll-manual-form">
            <label>Số tiết<input id="hours" data-testid="payroll-hours-input" type="number" value={manual.hours} onChange={(event) => setManual({ ...manual, hours: Number(event.target.value) })} /></label>
            <label>Hệ số học phần<input id="subjectCoef" data-testid="payroll-subject-coef-input" type="number" step="0.1" value={manual.subjectCoef} onChange={(event) => setManual({ ...manual, subjectCoef: Number(event.target.value) })} /></label>
            <label>Hệ số lớp<input id="classCoef" data-testid="payroll-class-coef-input" type="number" step="0.1" value={manual.classCoef} onChange={(event) => setManual({ ...manual, classCoef: Number(event.target.value) })} /></label>
            <label>Định mức<input id="rate" data-testid="payroll-rate-input" type="number" value={manual.rate} onChange={(event) => setManual({ ...manual, rate: Number(event.target.value) })} /></label>
            <label>Hệ số bằng cấp<input id="degreeCoef" data-testid="payroll-degree-coef-input" type="number" step="0.1" value={manual.degreeCoef} onChange={(event) => setManual({ ...manual, degreeCoef: Number(event.target.value) })} /></label>
          </form>
          <div id="result" data-testid="payroll-result-box" className="result-box">
            <p id="converted-hours" data-testid="payroll-converted-hours">Tiết quy đổi: <strong>{manualResult.convertedHours}</strong></p>
            <p id="amount" data-testid="payroll-amount">Thành tiền: <strong>{formatCurrency(manualResult.amount)}</strong></p>
          </div>
        </div>
      </section>
    </main>
  );
}
