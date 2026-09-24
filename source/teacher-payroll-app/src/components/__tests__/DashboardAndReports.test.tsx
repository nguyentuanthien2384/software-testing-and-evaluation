/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { HomeDashboard } from '../HomeDashboard';
import { PayrollCalculationPage } from '../PayrollCalculationPage';
import { ReportsPage } from '../ReportsPage';
import { TeacherStatisticsPage } from '../TeacherStatisticsPage';
import { ClassStatisticsPage } from '../ClassStatisticsPage';
import { initialData } from '@/lib/initial-data';
import { AppData } from '@/lib/types';
import { useAppData } from '@/lib/use-app-data';
import { buildPayrollCsv } from '@/lib/report-export';

jest.mock('@/lib/use-app-data', () => ({ useAppData: jest.fn() }));
jest.mock('@/lib/report-export', () => ({ buildPayrollCsv: jest.fn(() => 'test csv') }));

const mockedUseAppData = jest.mocked(useAppData);
const mockedBuildPayrollCsv = jest.mocked(buildPayrollCsv);

function mockData(data: AppData = initialData) {
  mockedUseAppData.mockReturnValue({ data } as ReturnType<typeof useAppData>);
}

function bodyRows(testId: string): HTMLTableRowElement[] {
  return Array.from(screen.getByTestId(testId).querySelectorAll('tbody tr'));
}

function cardValue(title: string): string | null {
  const card = Array.from(document.querySelectorAll('.stat-card')).find((item) => item.querySelector('span')?.textContent === title);
  return card?.querySelector('strong')?.textContent ?? null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockData();
});

test('bảng tính tiền lọc đồng thời theo giáo viên và năm, tổng thay đổi theo bộ lọc', () => {
  render(<PayrollCalculationPage />);
  expect(bodyRows('payroll-calculated-table')).toHaveLength(6);
  const teacherFilter = screen.getByRole('combobox', { name: 'Lọc tiền dạy theo giáo viên' });
  const yearFilter = screen.getByRole('combobox', { name: 'Lọc tiền dạy theo năm học' });
  fireEvent.change(teacherFilter, { target: { value: 'GV0001' } });
  expect(bodyRows('payroll-calculated-table')).toHaveLength(2);
  expect(bodyRows('payroll-calculated-table').every((row) => row.textContent?.includes('GV0001'))).toBe(true);

  fireEvent.change(yearFilter, { target: { value: '2025-2026' } });
  expect(bodyRows('payroll-calculated-table')).toHaveLength(1);
  expect(bodyRows('payroll-calculated-table')[0].textContent).toContain('Không có dữ liệu tính tiền.');
  expect(screen.getByTestId('payroll-calculated-table').querySelector('tfoot')?.textContent).toContain('0');
});

test('báo cáo lọc trước khi xuất CSV và in', () => {
  const createObjectURL = jest.fn(() => 'blob:test');
  const revokeObjectURL = jest.fn();
  const print = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  Object.defineProperty(window, 'print', { configurable: true, value: print });

  render(<ReportsPage />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc báo cáo theo năm học' }), { target: { value: '2024-2025' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc báo cáo theo khoa' }), { target: { value: 'Khoa Công nghệ thông tin' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc báo cáo theo giáo viên' }), { target: { value: 'GV0001' } });
  expect(bodyRows('reports-table')).toHaveLength(2);
  expect(cardValue('Số dòng báo cáo')).toBe('2');
  expect(cardValue('Số giáo viên')).toBe('1');

  fireEvent.click(screen.getByTestId('reports-export-csv-button'));
  expect(mockedBuildPayrollCsv).toHaveBeenCalledTimes(1);
  const exportedLines = mockedBuildPayrollCsv.mock.calls[0][0];
  expect(exportedLines.map((line) => line.assignmentId)).toEqual(['ASG-001', 'ASG-003']);
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  expect(click).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByTestId('reports-print-button'));
  expect(print).toHaveBeenCalledTimes(1);
  click.mockRestore();
});

test('dữ liệu tính tiền sai không làm sập dashboard hoặc báo cáo', () => {
  const incomplete: AppData = { ...initialData, paymentRates: initialData.paymentRates.filter((rate) => rate.year !== '2025-2026') };
  mockData(incomplete);
  const dashboard = render(<HomeDashboard />);
  expect(screen.getByRole('alert').textContent).toContain('2 phân công chưa thể tính');
  dashboard.unmount();

  render(<ReportsPage />);
  expect(screen.getByRole('alert').textContent).toContain('bỏ qua 2 phân công');
  expect(bodyRows('reports-table')).toHaveLength(4);
});

test('thống kê giáo viên kết hợp bộ lọc khoa và bằng cấp', () => {
  render(<TeacherStatisticsPage />);
  expect(cardValue('Giáo viên phù hợp')).toBe('8');
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc giáo viên theo khoa' }), { target: { value: 'DEP-CNTT' } });
  expect(cardValue('Giáo viên phù hợp')).toBe('2');
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc giáo viên theo bằng cấp' }), { target: { value: 'DEG-TS' } });
  expect(cardValue('Giáo viên phù hợp')).toBe('1');
  expect(bodyRows('teacher-statistics-table')).toHaveLength(1);
  expect(bodyRows('teacher-statistics-table')[0].textContent).toContain('Nguyễn Văn An');
});

test('thống kê lớp tính lớp chưa phân công và lọc theo học phần, kỳ học', () => {
  const extraClass = { id: 'CLS-NEW', code: 'CSDL101.99', subjectId: 'SUB-CSDL', semesterId: 'SEM-2025-1', studentCount: 25, note: '' };
  mockData({ ...initialData, classes: [...initialData.classes, extraClass] });
  render(<ClassStatisticsPage />);
  expect(cardValue('Lớp phù hợp')).toBe('7');
  expect(cardValue('Chưa phân công')).toBe('1');
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc lớp theo kỳ học' }), { target: { value: 'SEM-2025-1' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc lớp theo học phần' }), { target: { value: 'SUB-CSDL' } });
  expect(bodyRows('class-statistics-table')).toHaveLength(1);
  expect(bodyRows('class-statistics-table')[0].textContent).toContain('Chưa phân công');
  expect(cardValue('Tổng sinh viên')).toBe('25');
});
