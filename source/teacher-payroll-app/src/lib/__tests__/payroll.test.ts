import { initialData } from '../initial-data';
import {
  calculateAllPayrollLines,
  calculatePayrollLine,
  calculateTeachingPay,
  findClassCoefficient,
  findDegreeCoefficient,
  findPaymentRate,
  generateNextTeacherCode,
  getAge,
  groupAmountBy,
  sumAmount,
  validateTeacher
} from '../payroll';

describe('calculateTeachingPay', () => {
  test('tính tiền dạy theo công thức chuẩn', () => {
    expect(calculateTeachingPay({ hours: 45, subjectCoef: 1, classCoef: -0.1, rate: 143000, degreeCoef: 2 })).toEqual({
      convertedHours: 40.5,
      amount: 11583000
    });
  });

  test('tính được lớp có hệ số cộng', () => {
    expect(calculateTeachingPay({ hours: 60, subjectCoef: 1.2, classCoef: 0.1, rate: 143000, degreeCoef: 1.5 }).amount).toBe(16731000);
  });

  test('không cho số tiết âm', () => {
    expect(() => calculateTeachingPay({ hours: -1, subjectCoef: 1, classCoef: 0, rate: 100000, degreeCoef: 1 })).toThrow('Số tiết');
  });

  test('không cho tiết quy đổi âm', () => {
    expect(() => calculateTeachingPay({ hours: 45, subjectCoef: 0.1, classCoef: -0.5, rate: 100000, degreeCoef: 1 })).toThrow('Tiết quy đổi');
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

  test('lấy hệ số lớp theo sĩ số', () => {
    expect(findClassCoefficient(initialData.classCoefficients, '2024-2025', 82)).toBe(0.1);
  });
});

describe('quản lý giáo viên', () => {
  test('sinh mã giáo viên tiếp theo', () => {
    expect(generateNextTeacherCode([{ id: 'GV0001' }, { id: 'GV0009' }])).toBe('GV0010');
  });

  test('tính tuổi', () => {
    expect(getAge('2000-01-01', new Date('2026-01-02'))).toBe(26);
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
  test('tính được một dòng payroll từ phân công', () => {
    const line = calculatePayrollLine(initialData, initialData.assignments[0]);
    expect(line.teacherName).toBe('Nguyễn Văn An');
    expect(line.amount).toBeGreaterThan(0);
  });

  test('tính toàn bộ dòng payroll', () => {
    expect(calculateAllPayrollLines(initialData)).toHaveLength(initialData.assignments.length);
  });

  test('tổng tiền lớn hơn 0', () => {
    expect(sumAmount(calculateAllPayrollLines(initialData))).toBeGreaterThan(0);
  });

  test('group theo khoa', () => {
    const grouped = groupAmountBy(calculateAllPayrollLines(initialData), 'departmentName');
    expect(grouped.length).toBeGreaterThan(0);
    expect(grouped[0].amount).toBeGreaterThan(0);
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
  test('bắt lỗi hệ số lớp không phải số', () => {
    expect(() => calculateTeachingPay({ hours: 45, subjectCoef: 1, classCoef: Number.NaN, rate: 143000, degreeCoef: 2 })).toThrow('Hệ số lớp');
  });

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
    });
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
