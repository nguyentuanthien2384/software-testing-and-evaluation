/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { PayrollCalculationPage } from '../PayrollCalculationPage';
import { AppData } from '@/lib/types';
import { useAppData } from '@/lib/use-app-data';

jest.mock('@/lib/use-app-data', () => ({ useAppData: jest.fn() }));

const EMPTY_DATA: AppData = {
  degrees: [],
  departments: [],
  teachers: [],
  subjects: [],
  semesters: [],
  classes: [],
  assignments: [],
  paymentRates: [],
  degreeCoefficients: [],
  classCoefficients: []
};

const mockedUseAppData = jest.mocked(useAppData);

type ManualValues = {
  hours: string;
  subjectCoef: string;
  classCoef: string;
  rate: string;
  degreeCoef: string;
};

const TEST_IDS: Record<keyof ManualValues, string> = {
  hours: 'payroll-hours-input',
  subjectCoef: 'payroll-subject-coef-input',
  classCoef: 'payroll-class-coef-input',
  rate: 'payroll-rate-input',
  degreeCoef: 'payroll-degree-coef-input'
};

function input(field: keyof ManualValues): HTMLInputElement {
  return screen.getByTestId(TEST_IDS[field]) as HTMLInputElement;
}

function enterManualValues(values: ManualValues) {
  (Object.keys(values) as (keyof ManualValues)[]).forEach((field) => {
    fireEvent.change(input(field), { target: { value: values[field] } });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAppData.mockReturnValue({ data: EMPTY_DATA } as ReturnType<typeof useAppData>);
});

describe('PayrollCalculationPage - ràng buộc trường số', () => {
  test('đánh dấu cả năm đầu vào là bắt buộc và phải lớn hơn 0', () => {
    render(<PayrollCalculationPage />);

    (Object.keys(TEST_IDS) as (keyof ManualValues)[]).forEach((field) => {
      const current = input(field);
      expect(current.type).toBe('text');
      expect(current.inputMode).toBe('decimal');
      expect(current.required).toBe(true);
      expect(current.getAttribute('aria-required')).toBe('true');
      expect(current.getAttribute('data-min-exclusive')).toBe('0');
      expect(current.pattern).toBe('[0-9]*([.,][0-9]*)?');
    });
  });

  test('chặn số âm được dán, giữ khóa và mở khóa bằng Backspace', () => {
    render(<PayrollCalculationPage />);
    const hours = input('hours');

    fireEvent.input(hours, { target: { value: '-45' }, inputType: 'insertFromPaste' });
    expect(hours.value).toBe('');

    fireEvent.change(hours, { target: { value: '45' } });
    expect(hours.value).toBe('');

    fireEvent.keyDown(hours, { key: 'Backspace' });
    fireEvent.change(hours, { target: { value: '45' } });
    expect(hours.value).toBe('45');
  });

  test('chặn phím trừ, giữ khóa và mở khóa khi blur', () => {
    render(<PayrollCalculationPage />);
    const classCoefficient = input('classCoef');
    fireEvent.change(classCoefficient, { target: { value: '1.1' } });

    expect(fireEvent.keyDown(classCoefficient, { key: '-' })).toBe(false);
    expect(classCoefficient.value).toBe('');

    fireEvent.change(classCoefficient, { target: { value: '1.2' } });
    expect(classCoefficient.value).toBe('');

    fireEvent.blur(classCoefficient);
    fireEvent.change(classCoefficient, { target: { value: '1.2' } });
    expect(classCoefficient.value).toBe('1.2');
  });

  test('chặn dấu cộng mà không làm mất giá trị hợp lệ', () => {
    render(<PayrollCalculationPage />);
    const classCoefficient = input('classCoef');
    fireEvent.change(classCoefficient, { target: { value: '1.1' } });

    expect(fireEvent.keyDown(classCoefficient, { key: '+' })).toBe(false);
    expect(classCoefficient.value).toBe('1.1');
  });
});

describe('PayrollCalculationPage - tính thử thủ công', () => {
  test('tính đúng với bộ đầu vào hợp lệ', () => {
    render(<PayrollCalculationPage />);
    enterManualValues({ hours: '10', subjectCoef: '1.2', classCoef: '1.1', rate: '100000', degreeCoef: '1.5' });

    expect(screen.queryByTestId('payroll-error')).toBeNull();
    expect(screen.getByTestId('payroll-converted-hours').textContent).toContain('13.2');
    expect(screen.getByTestId('payroll-amount').textContent).toContain('1.980.000');
  });

  test.each([
    ['hours', 'Số tiết'],
    ['subjectCoef', 'Hệ số học phần'],
    ['classCoef', 'Hệ số lớp'],
    ['rate', 'Định mức'],
    ['degreeCoef', 'Hệ số bằng cấp']
  ] as const)('không tính khi %s bằng 0', (field, label) => {
    render(<PayrollCalculationPage />);
    const values: ManualValues = { hours: '45', subjectCoef: '1', classCoef: '1', rate: '100000', degreeCoef: '1' };
    values[field] = '0';
    enterManualValues(values);

    expect(screen.getByTestId('payroll-error').textContent).toBe(`${label} phải là số lớn hơn 0.`);
    expect(screen.queryByTestId('payroll-amount')).toBeNull();
  });

  test('hỗ trợ dấu phẩy thập phân theo cách nhập tiếng Việt', () => {
    render(<PayrollCalculationPage />);
    enterManualValues({ hours: '10,5', subjectCoef: '1,2', classCoef: '1,1', rate: '100000', degreeCoef: '1,5' });

    expect(input('hours').value).toBe('10,5');
    expect(screen.queryByTestId('payroll-error')).toBeNull();
    expect(screen.getByTestId('payroll-converted-hours').textContent).toContain('13.86');
    expect(screen.getByTestId('payroll-amount').textContent).toContain('2.079.000');
  });

  test.each([
    [
      'tiết quy đổi',
      { hours: `1${'0'.repeat(308)}`, subjectCoef: '2', classCoef: '1', rate: '1', degreeCoef: '1' },
      'Tiết quy đổi phải là số lớn hơn 0.'
    ],
    [
      'thành tiền',
      { hours: '1', subjectCoef: '1', classCoef: '1', rate: `1${'0'.repeat(308)}`, degreeCoef: '2' },
      'Thành tiền phải là số lớn hơn 0.'
    ]
  ])('hiển thị lỗi thay vì kết quả vô hạn khi tràn %s', (_case, values, expected) => {
    render(<PayrollCalculationPage />);
    enterManualValues(values);

    expect(screen.getByTestId('payroll-error').textContent).toBe(expected);
    expect(screen.queryByTestId('payroll-amount')).toBeNull();
  });
});
