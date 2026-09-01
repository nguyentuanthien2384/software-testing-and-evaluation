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
