import { initialData } from '../initial-data';
import type { PayrollInput, PayrollResult } from '../types';
import {
  calculateAllPayrollLines,
  calculateAllPayrollLinesSafely,
  calculatePayrollLine,
  calculateTeachingPay,
  findClassCoefficient,
  findDegreeCoefficient,
  findPaymentRate,
  generateNextTeacherCode,
  getAge,
  groupAmountBy,
  round,
  sumAmount,
  validateTeacher
} from '../payroll';

const validPayrollInput: PayrollInput = {
  hours: 45,
  subjectCoef: 1.2,
  classCoef: 0.9,
  rate: 143000,
  degreeCoef: 2
};

const invalidPayrollInputs: Array<[string, string, PayrollInput, string]> = [
  ['số tiết', 'bằng 0', { ...validPayrollInput, hours: 0 }, 'Số tiết phải là số lớn hơn 0.'],
  ['số tiết', 'âm', { ...validPayrollInput, hours: -1 }, 'Số tiết phải là số lớn hơn 0.'],
  ['số tiết', 'NaN', { ...validPayrollInput, hours: Number.NaN }, 'Số tiết phải là số lớn hơn 0.'],
  ['số tiết', '+Infinity', { ...validPayrollInput, hours: Number.POSITIVE_INFINITY }, 'Số tiết phải là số lớn hơn 0.'],
  ['số tiết', '-Infinity', { ...validPayrollInput, hours: Number.NEGATIVE_INFINITY }, 'Số tiết phải là số lớn hơn 0.'],
  ['hệ số học phần', 'bằng 0', { ...validPayrollInput, subjectCoef: 0 }, 'Hệ số học phần phải là số lớn hơn 0.'],
  ['hệ số học phần', 'âm', { ...validPayrollInput, subjectCoef: -0.1 }, 'Hệ số học phần phải là số lớn hơn 0.'],
  ['hệ số học phần', 'NaN', { ...validPayrollInput, subjectCoef: Number.NaN }, 'Hệ số học phần phải là số lớn hơn 0.'],
  ['hệ số học phần', '+Infinity', { ...validPayrollInput, subjectCoef: Number.POSITIVE_INFINITY }, 'Hệ số học phần phải là số lớn hơn 0.'],
  ['hệ số học phần', '-Infinity', { ...validPayrollInput, subjectCoef: Number.NEGATIVE_INFINITY }, 'Hệ số học phần phải là số lớn hơn 0.'],
  ['hệ số lớp', 'bằng 0', { ...validPayrollInput, classCoef: 0 }, 'Hệ số lớp phải là số lớn hơn 0.'],
  ['hệ số lớp', 'âm', { ...validPayrollInput, classCoef: -0.1 }, 'Hệ số lớp phải là số lớn hơn 0.'],
  ['hệ số lớp', 'NaN', { ...validPayrollInput, classCoef: Number.NaN }, 'Hệ số lớp phải là số lớn hơn 0.'],
  ['hệ số lớp', '+Infinity', { ...validPayrollInput, classCoef: Number.POSITIVE_INFINITY }, 'Hệ số lớp phải là số lớn hơn 0.'],
  ['hệ số lớp', '-Infinity', { ...validPayrollInput, classCoef: Number.NEGATIVE_INFINITY }, 'Hệ số lớp phải là số lớn hơn 0.'],
  ['định mức', 'bằng 0', { ...validPayrollInput, rate: 0 }, 'Định mức phải là số lớn hơn 0.'],
  ['định mức', 'âm', { ...validPayrollInput, rate: -1 }, 'Định mức phải là số lớn hơn 0.'],
  ['định mức', 'NaN', { ...validPayrollInput, rate: Number.NaN }, 'Định mức phải là số lớn hơn 0.'],
  ['định mức', '+Infinity', { ...validPayrollInput, rate: Number.POSITIVE_INFINITY }, 'Định mức phải là số lớn hơn 0.'],
  ['định mức', '-Infinity', { ...validPayrollInput, rate: Number.NEGATIVE_INFINITY }, 'Định mức phải là số lớn hơn 0.'],
  ['hệ số bằng cấp', 'bằng 0', { ...validPayrollInput, degreeCoef: 0 }, 'Hệ số bằng cấp phải là số lớn hơn 0.'],
  ['hệ số bằng cấp', 'âm', { ...validPayrollInput, degreeCoef: -0.1 }, 'Hệ số bằng cấp phải là số lớn hơn 0.'],
  ['hệ số bằng cấp', 'NaN', { ...validPayrollInput, degreeCoef: Number.NaN }, 'Hệ số bằng cấp phải là số lớn hơn 0.'],
  ['hệ số bằng cấp', '+Infinity', { ...validPayrollInput, degreeCoef: Number.POSITIVE_INFINITY }, 'Hệ số bằng cấp phải là số lớn hơn 0.'],
  ['hệ số bằng cấp', '-Infinity', { ...validPayrollInput, degreeCoef: Number.NEGATIVE_INFINITY }, 'Hệ số bằng cấp phải là số lớn hơn 0.']
];

describe('calculateTeachingPay', () => {
  test.each([
    [
      'hệ số lớp nhỏ hơn 1',
      { hours: 45, subjectCoef: 1, classCoef: 0.9, rate: 143000, degreeCoef: 2 },
      { convertedHours: 40.5, amount: 11583000 }
    ],
    [
      'hệ số học phần và hệ số lớp đều lớn hơn 1',
      { hours: 60, subjectCoef: 1.2, classCoef: 1.1, rate: 143000, degreeCoef: 1.5 },
      { convertedHours: 79.2, amount: 16988400 }
    ],
    [
      'tiết quy đổi cần làm tròn trước khi tính thành tiền',
      { hours: 10.075, subjectCoef: 1, classCoef: 1, rate: 100, degreeCoef: 1 },
      { convertedHours: 10.08, amount: 1008 }
    ]
  ] as Array<[string, PayrollInput, PayrollResult]>)('nhân đúng công thức với %s', (_case, input, expected) => {
    expect(calculateTeachingPay(input)).toEqual(expected);
  });

  test.each(invalidPayrollInputs)('từ chối %s %s', (_field, _invalidKind, input, expectedError) => {
    expect(() => calculateTeachingPay(input)).toThrow(expectedError);
  });

  test.each([
    [
      'tràn số khi nhân',
      { hours: Number.MAX_VALUE, subjectCoef: 2, classCoef: 1, rate: 1, degreeCoef: 1 }
    ],
    [
      'underflow khi nhân',
      { hours: Number.MIN_VALUE, subjectCoef: 0.1, classCoef: 1, rate: 1, degreeCoef: 1 }
    ]
  ] as Array<[string, PayrollInput]>)('từ chối tiết quy đổi %s', (_case, input) => {
    expect(() => calculateTeachingPay(input)).toThrow('Tiết quy đổi phải là số lớn hơn 0.');
  });

  test.each([
    [
      'tràn số',
      { hours: 1, subjectCoef: 1, classCoef: 1, rate: Number.MAX_VALUE, degreeCoef: 2 }
    ],
    [
      'bị làm tròn về 0',
      { hours: 1, subjectCoef: 1, classCoef: 1, rate: 0.49, degreeCoef: 1 }
    ]
  ] as Array<[string, PayrollInput]>)('từ chối thành tiền %s', (_case, input) => {
    expect(() => calculateTeachingPay(input)).toThrow('Thành tiền phải là số lớn hơn 0.');
  });

  test('làm tròn chính xác tại ranh giới số thập phân', () => {
    expect(round(10.075, 2)).toBe(10.08);
    expect(round(-1.005, 2)).toBe(-1.01);
    expect(round(-0, 2)).toBe(0);
    expect(round(10000000000000.002, 2)).toBe(10000000000000);
  });
});

describe('lookup cấu hình', () => {
  test('lấy định mức theo năm học', () => {
    expect(findPaymentRate(initialData, '2024-2025')).toBe(143000);
  });

  test('lỗi khi chưa có định mức', () => {
    expect(() => findPaymentRate(initialData, '2030-2031')).toThrow('Chưa thiết lập');
  });

  test('lấy hệ số bằng cấp theo năm học', () => {
    expect(findDegreeCoefficient(initialData, 'DEG-TS', '2024-2025')).toBe(2);
  });

  test.each([
    [1, 0.9], [40, 0.9],
    [41, 1], [80, 1],
    [81, 1.1], [120, 1.1],
    [121, 1.2], [300, 1.2]
  ])('lấy đúng hệ số lớp tại sĩ số %i', (studentCount, expected) => {
    expect(findClassCoefficient(initialData.classCoefficients, '2024-2025', studentCount)).toBe(expected);
    expect(findClassCoefficient(initialData.classCoefficients, '2025-2026', studentCount)).toBe(expected);
  });
});

describe('quản lý giáo viên', () => {
  test('sinh mã giáo viên tiếp theo', () => {
    expect(generateNextTeacherCode([{ id: 'GV0001' }, { id: 'GV0009' }])).toBe('GV0010');
  });

  test('tính tuổi', () => {
    expect(getAge('2000-01-01', new Date(2026, 0, 2))).toBe(26);
  });

  test('không chấp nhận ngày sinh không tồn tại', () => {
    expect(getAge('2024-02-30', new Date(2026, 0, 2))).toBe(0);
  });

  test('bắt lỗi email và số điện thoại', () => {
    const errors = validateTeacher({
      id: 'GV9999',
      fullName: 'Nguyễn A',
      dateOfBirth: '1990-01-01',
      phone: '123',
      email: 'sai-email',
      departmentId: 'DEP-CNTT',
      degreeId: 'DEG-TS',
      status: 'Đang giảng dạy'
    });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('báo cáo tiền dạy', () => {
  test('tính chính xác toàn bộ dữ liệu của một dòng payroll', () => {
    const line = calculatePayrollLine(initialData, initialData.assignments[0]);
    expect(line).toEqual({
      assignmentId: 'ASG-001',
      teacherId: 'GV0001',
      teacherName: 'Nguyễn Văn An',
      departmentName: 'Khoa Công nghệ thông tin',
      degreeName: 'TS',
      semesterName: 'Học kỳ 1 2024-2025',
      year: '2024-2025',
      classCode: 'CSDL101.01',
      subjectName: 'Cơ sở dữ liệu',
      teachingHours: 45,
      subjectCoefficient: 1,
      classCoefficient: 1,
      paymentRate: 143000,
      degreeCoefficient: 2,
      convertedHours: 45,
      amount: 12870000
    });
  });

  test('tính đúng số dòng và tổng tiền của toàn bộ dữ liệu mẫu', () => {
    const lines = calculateAllPayrollLines(initialData);
    expect(lines).toHaveLength(initialData.assignments.length);
    expect(sumAmount(lines)).toBe(78701400);
  });

  test('gom nhóm theo khoa với số dòng và tổng tiền chính xác', () => {
    const grouped = groupAmountBy(calculateAllPayrollLines(initialData), 'departmentName');
    expect(grouped).toEqual([
      { name: 'Khoa Công nghệ thông tin', amount: 38931750, count: 3 },
      { name: 'Khoa Điện tử - Viễn thông', amount: 29745900, count: 2 },
      { name: 'Khoa Xây dựng', amount: 10023750, count: 1 }
    ]);
  });

  test('giữ các dòng hợp lệ và báo đúng mã phân công khi một dòng bị lỗi', () => {
    const data = structuredClone(initialData);
    data.assignments.push({
      ...data.assignments[0],
      id: 'ASG-BROKEN',
      teacherId: 'GV-KHONG-TON-TAI'
    });

    expect(calculateAllPayrollLinesSafely(data)).toEqual({
      lines: calculateAllPayrollLines(initialData),
      errors: ['ASG-BROKEN: Không tìm thấy giáo viên.']
    });
  });
});

import {
  classHasRelatedData,
  degreeHasRelatedData,
  departmentHasRelatedData,
  filterPayrollLines,
  formatCurrency,
  formatNumber,
  teacherHasRelatedData
} from '../payroll';

describe('coverage bổ sung cho business rule', () => {
  test('fallback hệ số bằng cấp mặc định khi chưa có cấu hình năm', () => {
    expect(findDegreeCoefficient(initialData, 'DEG-TS', '2030-2031')).toBe(2);
  });

  test('lỗi khi bằng cấp không tồn tại', () => {
    expect(() => findDegreeCoefficient(initialData, 'DEG-UNKNOWN', '2030-2031')).toThrow('Không tìm thấy bằng cấp');
  });

  test('lỗi khi không có hệ số lớp phù hợp', () => {
    expect(() => findClassCoefficient(initialData.classCoefficients, '2024-2025', 999)).toThrow('Chưa thiết lập hệ số lớp');
  });

  test('tuổi bằng 0 nếu ngày sinh sai', () => {
    expect(getAge('khong-hop-le')).toBe(0);
  });

  test('validate giáo viên bắt thiếu tên, thiếu khoa, thiếu bằng cấp, sai tuổi', () => {
    const errors = validateTeacher({
      id: 'GV9998',
      fullName: ' ',
      dateOfBirth: '2010-01-01',
      phone: '0123456789',
      email: 'a@example.com',
      departmentId: '',
      degreeId: '',
      status: 'Đang giảng dạy'
    }, new Date(2026, 0, 1));
    expect(errors).toEqual(expect.arrayContaining([
      'Họ tên giáo viên là bắt buộc.',
      'Tuổi giáo viên phải trong khoảng 22 đến 70.',
      'Phải chọn khoa.',
      'Phải chọn bằng cấp.'
    ]));
  });

  test('filter payroll theo năm, giáo viên, khoa và kỳ', () => {
    const lines = calculateAllPayrollLines(initialData);
    const first = lines[0];
    const filtered = filterPayrollLines(lines, {
      year: first.year,
      teacherId: first.teacherId,
      departmentName: first.departmentName,
      semesterName: first.semesterName
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((line) => line.teacherId === first.teacherId)).toBe(true);
  });

  test('filter payroll loại bỏ dữ liệu không khớp', () => {
    const lines = calculateAllPayrollLines(initialData);
    expect(filterPayrollLines(lines, { year: 'khong-co' })).toHaveLength(0);
  });

  test('các hàm kiểm tra liên kết dữ liệu', () => {
    expect(teacherHasRelatedData('GV0001', initialData.assignments)).toBe(true);
    expect(teacherHasRelatedData('GV9999', initialData.assignments)).toBe(false);
    expect(degreeHasRelatedData('DEG-TS', initialData.teachers)).toBe(true);
    expect(degreeHasRelatedData('DEG-X', initialData.teachers)).toBe(false);
    expect(departmentHasRelatedData('DEP-CNTT', initialData.teachers)).toBe(true);
    expect(departmentHasRelatedData('DEP-X', initialData.teachers)).toBe(false);
    expect(classHasRelatedData('CLS-CSDL-01', initialData.assignments)).toBe(true);
    expect(classHasRelatedData('CLS-X', initialData.assignments)).toBe(false);
  });

  test('định dạng tiền và số', () => {
    expect(formatCurrency(1000000)).toContain('₫');
    expect(formatNumber(1000000)).toBe('1.000.000');
  });

  test('lỗi khi phân công tham chiếu giáo viên không tồn tại', () => {
    expect(() => calculatePayrollLine(initialData, { ...initialData.assignments[0], teacherId: 'GV-X' })).toThrow('Không tìm thấy giáo viên');
  });
});
