import { copyDegreeCoefficients, nextAcademicYear } from '../coefficient-copy';
import { initialData } from '../initial-data';

describe('sao chép hệ số giáo viên', () => {
  test('tạo bộ hệ số cho năm liền sau và giữ nguyên giá trị', () => {
    const data = { degreeCoefficients: initialData.degreeCoefficients.filter((item) => item.year === '2024-2025') };
    const original = structuredClone(data);
    const result = copyDegreeCoefficients(data, '2024-2025', '2025-2026');
    expect(result.ok).toBe(true);
    expect(data).toEqual(original);
    if (result.ok) {
      expect(result.coefficients).toHaveLength(4);
      expect(result.coefficients.every((item) => item.year === '2025-2026')).toBe(true);
      expect(result.coefficients.map((item) => item.coefficient)).toEqual([2, 1.5, 1.3, 1.1]);
      expect(result.coefficients.map((item) => item.id)).toEqual([
        'DCOEF-2025-001', 'DCOEF-2025-002', 'DCOEF-2025-003', 'DCOEF-2025-004'
      ]);
      expect(result.coefficients.map((item) => item.degreeId)).toEqual(data.degreeCoefficients.map((item) => item.degreeId));
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

  test('từ chối năm sai định dạng và năm không liên tiếp', () => {
    expect(nextAcademicYear('2024/2025')).toBe('');
    expect(copyDegreeCoefficients(initialData, '2024/2025', '2025-2026')).toEqual({
      ok: false, error: 'Năm nguồn và năm đích phải có dạng YYYY-YYYY.'
    });
    expect(copyDegreeCoefficients(initialData, '2024-2025', '2025-2027').ok).toBe(false);
  });

  test('báo lỗi khi năm nguồn không có hệ số', () => {
    expect(copyDegreeCoefficients({ degreeCoefficients: [] }, '2024-2025', '2025-2026')).toEqual({
      ok: false, error: 'Không có hệ số nào trong năm 2024-2025.'
    });
  });

  test('từ chối mã tự sinh trùng với bản ghi khác năm', () => {
    const source = initialData.degreeCoefficients.filter((item) => item.year === '2024-2025');
    const collision = { ...source[0], id: 'DCOEF-2025-001', year: '2023-2024' };
    expect(copyDegreeCoefficients({ degreeCoefficients: [...source, collision] }, '2024-2025', '2025-2026')).toEqual({
      ok: false, error: 'Mã hệ số tự sinh đã tồn tại. Hãy kiểm tra dữ liệu năm đích.'
    });
  });
});
