'use client';

import { KeyboardEvent, useMemo, useRef, useState } from 'react';
import { calculateAllPayrollLinesSafely, calculateTeachingPay, formatCurrency } from '@/lib/payroll';
import { isNonNegativeNumericDraft, parseNumericDraft } from '@/lib/numeric-input';
import { useAppData } from '@/lib/use-app-data';
import { AppDataStatus } from './AppDataStatus';

export function PayrollCalculationPage() {
  const { data, loaded, loadError, reloadData } = useAppData();
  const { lines, errors: calculationErrors } = calculateAllPayrollLinesSafely(data);
  const [teacherId, setTeacherId] = useState('');
  const [year, setYear] = useState('');
  const [manual, setManual] = useState({ hours: '', subjectCoef: '', classCoef: '', rate: '', degreeCoef: '' });
  const rejectedManualFields = useRef(new Set<keyof typeof manual>());

  const filtered = useMemo(
    () => lines.filter((line) => (!teacherId || line.teacherId === teacherId) && (!year || line.year === year)),
    [lines, teacherId, year]
  );
  const { manualResult, manualError } = useMemo(() => {
    if (Object.values(manual).every((value) => value === '')) {
      return { manualResult: null, manualError: '' };
    }

    const inputs = [
      { label: 'Số tiết', value: parseNumericDraft(manual.hours) },
      { label: 'Hệ số học phần', value: parseNumericDraft(manual.subjectCoef) },
      { label: 'Hệ số lớp', value: parseNumericDraft(manual.classCoef) },
      { label: 'Định mức', value: parseNumericDraft(manual.rate) },
      { label: 'Hệ số bằng cấp', value: parseNumericDraft(manual.degreeCoef) }
    ];
    const invalidInput = inputs.find((input) => !Number.isFinite(input.value) || input.value <= 0);
    if (invalidInput) {
      return { manualResult: null, manualError: `${invalidInput.label} phải là số lớn hơn 0.` };
    }

    try {
      return {
        manualResult: calculateTeachingPay({
          hours: inputs[0].value,
          subjectCoef: inputs[1].value,
          classCoef: inputs[2].value,
          rate: inputs[3].value,
          degreeCoef: inputs[4].value
        }),
        manualError: ''
      };
    } catch (error) {
      return { manualResult: null, manualError: error instanceof Error ? error.message : 'Lỗi tính toán.' };
    }
  }, [manual]);

  function updateManualValue(field: keyof typeof manual, value: string) {
    if (value.includes('-')) {
      rejectedManualFields.current.add(field);
      setManual((current) => ({ ...current, [field]: '' }));
      return;
    }
    if (rejectedManualFields.current.has(field)) {
      if (value === '') rejectedManualFields.current.delete(field);
      else setManual((current) => ({ ...current, [field]: '' }));
      return;
    }
    if (isNonNegativeNumericDraft(value)) setManual((current) => ({ ...current, [field]: value }));
  }

  function handleManualKeyDown(field: keyof typeof manual, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === '-' || event.key === '+') {
      event.preventDefault();
      if (event.key === '-') {
        rejectedManualFields.current.add(field);
        setManual((current) => ({ ...current, [field]: '' }));
      }
      return;
    }
    if (!rejectedManualFields.current.has(field)) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      rejectedManualFields.current.delete(field);
      return;
    }
    if (!['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key)) {
      event.preventDefault();
    }
  }
  const total = filtered.reduce((sum, line) => sum + line.amount, 0);
  const years = Array.from(new Set(data.semesters.map((semester) => semester.year)));

  if (!loaded) return <main className="page"><AppDataStatus loaded={loaded} loadError={loadError} reloadData={reloadData} /></main>;

  return (
    <main className="page" data-testid="payroll-page">
      <AppDataStatus loaded={loaded} loadError={loadError} reloadData={reloadData} />
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
            <select aria-label="Lọc tiền dạy theo giáo viên" data-testid="payroll-teacher-filter" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">Tất cả giáo viên</option>
              {data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.id} - {teacher.fullName}</option>)}
            </select>
            <select aria-label="Lọc tiền dạy theo năm học" data-testid="payroll-year-filter" value={year} onChange={(event) => setYear(event.target.value)}>
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
            <label>Số tiết<input id="hours" aria-label="Số tiết" aria-required="true" data-testid="payroll-hours-input" data-min-exclusive="0" type="text" inputMode="decimal" pattern="[0-9]*([.,][0-9]*)?" required value={manual.hours} onChange={(event) => updateManualValue('hours', event.target.value)} onKeyDown={(event) => handleManualKeyDown('hours', event)} onBlur={() => rejectedManualFields.current.delete('hours')} /></label>
            <label>Hệ số học phần<input id="subjectCoef" aria-label="Hệ số học phần" aria-required="true" data-testid="payroll-subject-coef-input" data-min-exclusive="0" type="text" inputMode="decimal" pattern="[0-9]*([.,][0-9]*)?" required value={manual.subjectCoef} onChange={(event) => updateManualValue('subjectCoef', event.target.value)} onKeyDown={(event) => handleManualKeyDown('subjectCoef', event)} onBlur={() => rejectedManualFields.current.delete('subjectCoef')} /></label>
            <label>Hệ số lớp<input id="classCoef" aria-label="Hệ số lớp" aria-required="true" data-testid="payroll-class-coef-input" data-min-exclusive="0" type="text" inputMode="decimal" pattern="[0-9]*([.,][0-9]*)?" required value={manual.classCoef} onChange={(event) => updateManualValue('classCoef', event.target.value)} onKeyDown={(event) => handleManualKeyDown('classCoef', event)} onBlur={() => rejectedManualFields.current.delete('classCoef')} /></label>
            <label>Định mức<input id="rate" aria-label="Định mức" aria-required="true" data-testid="payroll-rate-input" data-min-exclusive="0" type="text" inputMode="decimal" pattern="[0-9]*([.,][0-9]*)?" required value={manual.rate} onChange={(event) => updateManualValue('rate', event.target.value)} onKeyDown={(event) => handleManualKeyDown('rate', event)} onBlur={() => rejectedManualFields.current.delete('rate')} /></label>
            <label>Hệ số bằng cấp<input id="degreeCoef" aria-label="Hệ số bằng cấp" aria-required="true" data-testid="payroll-degree-coef-input" data-min-exclusive="0" type="text" inputMode="decimal" pattern="[0-9]*([.,][0-9]*)?" required value={manual.degreeCoef} onChange={(event) => updateManualValue('degreeCoef', event.target.value)} onKeyDown={(event) => handleManualKeyDown('degreeCoef', event)} onBlur={() => rejectedManualFields.current.delete('degreeCoef')} /></label>
          </form>
          <div id="result" data-testid="payroll-result-box" className="result-box">
            {manualError && <p data-testid="payroll-error" role="alert" style={{ color: '#e53e3e' }}>{manualError}</p>}
            {!manualError && !manualResult && <p data-testid="payroll-pending">Nhập đầy đủ các chỉ số lớn hơn 0 để tính.</p>}
            {manualResult && (
              <>
                <p id="converted-hours" data-testid="payroll-converted-hours">Tiết quy đổi: <strong>{manualResult.convertedHours}</strong></p>
                <p id="amount" data-testid="payroll-amount">Thành tiền: <strong>{formatCurrency(manualResult.amount)}</strong></p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
