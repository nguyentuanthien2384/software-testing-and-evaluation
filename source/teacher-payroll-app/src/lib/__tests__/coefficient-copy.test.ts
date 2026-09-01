import { copyDegreeCoefficients, nextAcademicYear } from '../coefficient-copy';
import { initialData } from '../initial-data';

describe('sao chép hệ số giáo viên', () => {
  test('tạo bộ hệ số cho năm liền sau và giữ nguyên giá trị', () => {
    const data = { degreeCoefficients: initialData.degreeCoefficients.filter((item) => item.year === '2024-2025') };
    const result = copyDegreeCoefficients(data, '2024-2025', '2025-2026');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coefficients).toHaveLength(4);
      expect(result.coefficients.every((item) => item.year === '2025-2026')).toBe(true);
      expect(result.coefficients.map((item) => item.coefficient)).toEqual([2, 1.5, 1.3, 1.1]);
    }
  });

  test('không ghi đè năm đã có dữ liệu', () => {
    const result = copyDegreeCoefficients(initialData, '2024-2025', '2025-2026');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('đã có hệ số');
  });

  test('chỉ cho sao chép sang năm liền sau', () => {
    expect(copyDegreeCoefficients(initialData, '2024-2025', '2026-2027').ok).toBe(false);
    expect(nextAcademicYear('2025-2026')).toBe('2026-2027');
  });
});
