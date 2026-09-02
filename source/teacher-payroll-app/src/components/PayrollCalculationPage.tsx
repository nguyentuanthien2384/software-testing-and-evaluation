'use client';

import { useMemo, useState } from 'react';
import { calculateAllPayrollLinesSafely, calculateTeachingPay, formatCurrency } from '@/lib/payroll';
import { parseNumericDraft } from '@/lib/numeric-input';
import { useAppData } from '@/lib/use-app-data';

export function PayrollCalculationPage() {
  const { data } = useAppData();
  const { lines, errors: calculationErrors } = calculateAllPayrollLinesSafely(data);
  const [teacherId, setTeacherId] = useState('');
  const [year, setYear] = useState('');
  const [manual, setManual] = useState({ hours: '45', subjectCoef: '1', classCoef: '0', rate: '143000', degreeCoef: '1.5' });

  const filtered = useMemo(
    () => lines.filter((line) => (!teacherId || line.teacherId === teacherId) && (!year || line.year === year)),
    [lines, teacherId, year]
  );
  const { manualResult, manualError } = useMemo(() => {
    try {
      return {
        manualResult: calculateTeachingPay({
          hours: parseNumericDraft(manual.hours),
          subjectCoef: parseNumericDraft(manual.subjectCoef),
          classCoef: parseNumericDraft(manual.classCoef),
          rate: parseNumericDraft(manual.rate),
          degreeCoef: parseNumericDraft(manual.degreeCoef)
        }),
        manualError: ''
      };
    } catch (error) {
      return { manualResult: { convertedHours: 0, amount: 0 }, manualError: error instanceof Error ? error.message : 'Lỗi tính toán.' };
    }
  }, [manual]);
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
          {calculationErrors.length > 0 && (
            <div className="error-message" data-testid="payroll-data-errors" role="alert">
              <strong>{calculationErrors.length} phân công chưa thể tính:</strong>
              <ul>{calculationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          )}
          <div className="table-wrapper">
            <table data-testid="payroll-calculated-table">
              <thead><tr><th>Giáo viên</th><th>Năm học</th><th>Lớp</th><th>Học phần</th><th>Tiết</th><th>Hệ số HP</th><th>Hệ số lớp</th><th>Hệ số GV</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9}>Không có dữ liệu tính tiền.</td></tr>}
                {filtered.map((line) => (
                  <tr key={line.assignmentId}>
                    <td>{line.teacherId} - {line.teacherName}</td>
                    <td>{line.year}</td>
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
              <tfoot><tr><td colSpan={8}>Tổng</td><td>{formatCurrency(total)}</td></tr></tfoot>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Tính thử thủ công</h2>
          <form className="form-grid" data-testid="payroll-manual-form">
            <label>Số tiết<input id="hours" data-testid="payroll-hours-input" type="text" inputMode="decimal" value={manual.hours} onChange={(event) => setManual({ ...manual, hours: event.target.value })} /></label>
            <label>Hệ số học phần<input id="subjectCoef" data-testid="payroll-subject-coef-input" type="text" inputMode="decimal" value={manual.subjectCoef} onChange={(event) => setManual({ ...manual, subjectCoef: event.target.value })} /></label>
            <label>Hệ số lớp<input id="classCoef" data-testid="payroll-class-coef-input" type="text" inputMode="decimal" value={manual.classCoef} onChange={(event) => setManual({ ...manual, classCoef: event.target.value })} /></label>
            <label>Định mức<input id="rate" data-testid="payroll-rate-input" type="text" inputMode="decimal" value={manual.rate} onChange={(event) => setManual({ ...manual, rate: event.target.value })} /></label>
            <label>Hệ số bằng cấp<input id="degreeCoef" data-testid="payroll-degree-coef-input" type="text" inputMode="decimal" value={manual.degreeCoef} onChange={(event) => setManual({ ...manual, degreeCoef: event.target.value })} /></label>
          </form>
          <div id="result" data-testid="payroll-result-box" className="result-box">
            {manualError && <p data-testid="payroll-error" style={{ color: '#e53e3e' }}>{manualError}</p>}
            <p id="converted-hours" data-testid="payroll-converted-hours">Tiết quy đổi: <strong>{manualResult.convertedHours}</strong></p>
            <p id="amount" data-testid="payroll-amount">Thành tiền: <strong>{formatCurrency(manualResult.amount)}</strong></p>
          </div>
        </div>
      </section>
    </main>
  );
}
