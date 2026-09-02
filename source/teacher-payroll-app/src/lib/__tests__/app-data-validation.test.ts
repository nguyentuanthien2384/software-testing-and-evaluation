import { getSemesterStatus, isValidAcademicYear, validateAppData, validateEntityMutation } from '../app-data-validation';
import { initialData } from '../initial-data';

function copyData() {
  return structuredClone(initialData);
}

describe('validateAppData', () => {
  test('chấp nhận dữ liệu mẫu hợp lệ', () => {
    expect(validateAppData(copyData())).toEqual({ ok: true, data: initialData });
  });

  test('từ chối mã học phần trùng không phân biệt hoa thường', () => {
    const data = copyData();
    data.subjects.push({ ...data.subjects[0], id: 'SUB-NEW', code: data.subjects[0].code.toLowerCase() });
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('Mã học phần');
  });

  test('từ chối ngày kỳ học đảo ngược và năm học sai định dạng', () => {
    const data = copyData();
    data.semesters[0] = { ...data.semesters[0], year: '2024-2026', startDate: '2025-05-01', endDate: '2025-01-01' };
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('hai năm liên tiếp');
      expect(result.errors.join(' ')).toContain('phải trước ngày kết thúc');
    }
  });

  test('từ chối khoảng hệ số lớp chồng lấn', () => {
    const data = copyData();
    data.classCoefficients[1] = { ...data.classCoefficients[1], minStudents: 40 };
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('chồng lấn');
  });

  test('từ chối phân công trùng lớp và số tiết không dương', () => {
    const data = copyData();
    data.assignments.push({ ...data.assignments[0], id: 'ASG-NEW', teachingHours: 0 });
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('phải lớn hơn 0');
      expect(result.errors.join(' ')).toContain('đã được phân công');
    }
  });

  test('từ chối dữ liệu khi phân công không có định mức của năm học', () => {
    const data = copyData();
    data.paymentRates = data.paymentRates.filter((item) => item.year !== '2024-2025');

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('ASG-001: chưa thiết lập định mức tiền tiết cho năm học 2024-2025.');
    }
  });

  test('từ chối dữ liệu khi sĩ số lớp được phân công không thuộc khoảng hệ số nào', () => {
    const data = copyData();
    const classIndex = data.classes.findIndex((item) => item.id === 'CLS-CTDL-02');
    data.classes[classIndex] = { ...data.classes[classIndex], studentCount: 301 };

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('ASG-004: chưa thiết lập hệ số lớp cho sĩ số 301 trong năm học 2024-2025.');
    }
  });

  test('trả lỗi kiểm tra thay vì ném ngoại lệ khi bản ghi bằng cấp là null', () => {
    const data = copyData();
    (data.degrees as unknown[])[0] = null;

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('degrees[0] không phải là một bản ghi hợp lệ.');
  });

  test('trả lỗi kiểm tra khi bản ghi giáo viên chỉ có mã', () => {
    const data = copyData();
    data.teachers[0] = { id: 'GV-THIEU-TRUONG' } as unknown as typeof data.teachers[number];

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        'GV-THIEU-TRUONG: Họ tên giáo viên là bắt buộc.',
        'GV-THIEU-TRUONG: Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.',
        'GV-THIEU-TRUONG: Email không hợp lệ.'
      ]));
    }
  });

  test('trả lỗi kiểm tra khi bản ghi kỳ học chỉ có mã', () => {
    const data = copyData();
    data.semesters[0] = { id: 'SEM-THIEU-TRUONG' } as unknown as typeof data.semesters[number];

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        'Kỳ học SEM-THIEU-TRUONG thiếu tên.',
        'Năm học của SEM-THIEU-TRUONG phải có dạng YYYY-YYYY và hai năm liên tiếp.',
        'Ngày của kỳ học SEM-THIEU-TRUONG không hợp lệ.'
      ]));
    }
  });

  test('không cho sửa khoá chính', () => {
    const row = { ...copyData().degrees[0], id: 'DEG-CHANGED' };
    expect(validateEntityMutation('degrees', row, copyData(), 'DEG-TS')).toContain('Không được thay đổi mã định danh khi chỉnh sửa.');
  });
});

describe('tiện ích kỳ học', () => {
  test('xác nhận năm học gồm hai năm liên tiếp', () => {
    expect(isValidAcademicYear('2025-2026')).toBe(true);
    expect(isValidAcademicYear('2025-2027')).toBe(false);
  });

  test('tính trạng thái kỳ học theo ngày', () => {
    const semester = { startDate: '2026-08-01', endDate: '2026-09-30' };
    expect(getSemesterStatus(semester, new Date(2026, 8, 1))).toBe('Đang diễn ra');
    expect(getSemesterStatus(semester, new Date(2026, 6, 1))).toBe('Sắp diễn ra');
    expect(getSemesterStatus(semester, new Date(2026, 10, 1))).toBe('Đã kết thúc');
  });
});
