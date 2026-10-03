import { getSemesterStatus, isValidAcademicYear, validateAppData, validateEntityMutation } from '../app-data-validation';
import { createBackup, parseBackup } from '../backup';
import { copyDegreeCoefficients, nextAcademicYear } from '../coefficient-copy';
import { initialData } from '../initial-data';
import { isNonNegativeNumericDraft } from '../numeric-input';
import { calculateAllPayrollLinesSafely, calculateTeachingPay, validateTeacher } from '../payroll';
import type { AppData, PayrollInput, PayrollResult } from '../types';

describe('financial decimal regression cases', () => {
  test.each([
    [
      'round converted hours at an exact decimal half',
      { hours: 0.1, subjectCoef: 0.7, classCoef: 1.5, rate: 100, degreeCoef: 1 },
      { convertedHours: 0.11, amount: 11 }
    ],
    [
      'round VND at an exact decimal half',
      { hours: 0.03, subjectCoef: 1, classCoef: 1, rate: 180, degreeCoef: 2.5 },
      { convertedHours: 0.03, amount: 14 }
    ],
    [
      'round another multiplication order without losing one VND',
      { hours: 0.05, subjectCoef: 1, classCoef: 1, rate: 225, degreeCoef: 2.8 },
      { convertedHours: 0.05, amount: 32 }
    ],
    [
      'retain two-stage rounding before multiplying the rate',
      { hours: 10.074, subjectCoef: 1, classCoef: 1, rate: 10000, degreeCoef: 1 },
      { convertedHours: 10.07, amount: 100700 }
    ]
  ] as Array<[string, PayrollInput, PayrollResult]>)('%s', (_name, input, expected) => {
    expect(calculateTeachingPay(input)).toEqual(expected);
  });

  test('reject amounts that cannot be represented as exact integer VND', () => {
    expect(() => calculateTeachingPay({ hours: 1, subjectCoef: 1, classCoef: 1, rate: 2 ** 53, degreeCoef: 1 }))
      .toThrow('Thành tiền vượt quá giới hạn số nguyên an toàn.');
  });

  test('retain the largest exactly representable integer VND amount', () => {
    expect(calculateTeachingPay({ hours: 1, subjectCoef: 1, classCoef: 1, rate: Number.MAX_SAFE_INTEGER, degreeCoef: 1 }))
      .toEqual({ convertedHours: 1, amount: Number.MAX_SAFE_INTEGER });
  });
});

describe('financial snapshot checks preserve incremental configuration', () => {
  test.each([
    ['overflow in the calculated amount', (data: AppData) => { data.paymentRates[0].amount = Number.MAX_VALUE; }],
    ['amount outside exact integer precision', (data: AppData) => { data.paymentRates[0].amount = 2 ** 53; }],
    ['hours rounded down to zero', (data: AppData) => { data.assignments[0].teachingHours = 0.001; }],
    ['amount rounded down to zero', (data: AppData) => { data.paymentRates[0].amount = 0.001; }]
  ] as Array<[string, (data: AppData) => void]>)('reject %s before persisting', (_name, mutate) => {
    const data = structuredClone(initialData);
    mutate(data);
    const calculation = calculateAllPayrollLinesSafely(data);
    expect(calculation.errors.length).toBeGreaterThan(0);
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining(calculation.errors));
  });

  test('still allow the documented default degree coefficient when a year has no custom coefficients', () => {
    const data = structuredClone(initialData);
    data.degreeCoefficients = [];
    expect(validateAppData(data)).toEqual({ ok: true, data });
    expect(calculateAllPayrollLinesSafely(data).errors).toEqual([]);
  });

  test('allow adding the first annual coefficient and completing the remaining degrees through CRUD', () => {
    const data = structuredClone(initialData);
    const source = data.degreeCoefficients.filter((item) => item.year === '2024-2025');
    data.degreeCoefficients = data.degreeCoefficients.filter((item) => item.year !== '2024-2025');
    expect(validateAppData(data).ok).toBe(true);
    for (const coefficient of source) {
      expect(validateEntityMutation('degreeCoefficients', coefficient, data, null)).toEqual([]);
      data.degreeCoefficients.push(coefficient);
      expect(validateAppData(data).ok).toBe(true);
    }
    expect(calculateAllPayrollLinesSafely(data).errors).toEqual([]);
  });

  test('report incomplete annual coefficients without preventing their incremental configuration', () => {
    const data = structuredClone(initialData);
    data.degreeCoefficients = data.degreeCoefficients.filter((item) =>
      item.year !== '2024-2025' || item.degreeId !== 'DEG-TS');
    expect(validateAppData(data).ok).toBe(true);
    expect(calculateAllPayrollLinesSafely(data).errors).toEqual([
      'ASG-001: Chưa thiết lập hệ số bằng cấp TS cho năm học 2024-2025.',
      'ASG-003: Chưa thiết lập hệ số bằng cấp TS cho năm học 2024-2025.'
    ]);
  });
});

describe('academic year keys remain canonical across validation and lookups', () => {
  test.each([' 2024-2025', '2024-2025 ', '\t2024-2025\n', '2024-2025\n'])('reject whitespace in %p', (year) => {
    expect(isValidAcademicYear(year)).toBe(false);
  });

  test.each(['semesters', 'paymentRates', 'degreeCoefficients', 'classCoefficients'] as const)(
    'reject a padded year in %s rather than persisting a different lookup key', (entity) => {
      const data = structuredClone(initialData);
      data[entity][0].year = ` ${data[entity][0].year} `;
      const result = validateAppData(data);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.some((error) => error.includes('Năm học'))).toBe(true);
    }
  );

  test.each(['2024-2026', '2024/2025', ' 2024-2025'])('do not suggest the next year from invalid source %p', (year) => {
    expect(nextAcademicYear(year)).toBe('');
  });

  test('preserve four digit years at the lower supported boundary', () => {
    expect(nextAcademicYear('0098-0099')).toBe('0099-0100');
  });

  test('return no suggestion when the next academic year cannot use four digits', () => {
    expect(nextAcademicYear('9998-9999')).toBe('');
  });
});

describe('validators consume the entire field, including its last newline', () => {
  test.each([
    ['phone', '0123456789\n', 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'],
    ['email', 'teacher@example.com\n', 'Email không hợp lệ.'],
    ['dateOfBirth', '1980-03-12\n', 'Tuổi giáo viên phải trong khoảng 22 đến 70.']
  ] as const)('reject a newline after teacher %s', (field, value, expectedError) => {
    expect(validateTeacher({ ...initialData.teachers[0], [field]: value }, new Date(2026, 9, 3))).toContain(expectedError);
  });

  test('reject newline in a stored date rather than showing an invalid semester as ongoing', () => {
    const data = structuredClone(initialData);
    data.semesters[0].startDate += '\n';
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    expect(getSemesterStatus(data.semesters[0], new Date(2026, 9, 3))).toBe('Không hợp lệ');
  });

  test.each(['1\n', '1.5\n'])('reject a newline in numeric typing draft %p', (value) => {
    expect(isNonNegativeNumericDraft(value)).toBe(false);
  });
});

describe('coefficient copy uses the same uniqueness rule as persistence', () => {
  test.each(['dcoef-2025-001', ' DCOEF-2025-001 '])('reject generated ID collision with %p', (id) => {
    const source = initialData.degreeCoefficients.filter((item) => item.year === '2024-2025');
    const collision = { ...source[0], id, year: '2023-2024' };
    expect(copyDegreeCoefficients({ degreeCoefficients: [...source, collision] }, '2024-2025', '2025-2026')).toEqual({
      ok: false,
      error: 'Mã hệ số tự sinh đã tồn tại. Hãy kiểm tra dữ liệu năm đích.'
    });
  });
});

describe('backup timestamp is an actual ISO timestamp', () => {
  test.each(['0', '2026-02-30T10:00:00.000Z', '2026-09-24', '2026-09-24T10:00:00'])(
    'reject ambiguous or impossible exportedAt %p', (exportedAt) => {
      expect(parseBackup(createBackup(initialData, exportedAt))).toEqual({
        ok: false,
        errors: ['Tệp backup thiếu thời điểm xuất hợp lệ.']
      });
    }
  );

  test.each(['2024-02-29T10:00:00.000Z', '2026-09-24T17:00:00+07:00'])(
    'accept a valid leap day or an explicit timezone %p', (exportedAt) => {
      expect(parseBackup(createBackup(initialData, exportedAt))).toEqual({ ok: true, data: initialData });
    }
  );
});
