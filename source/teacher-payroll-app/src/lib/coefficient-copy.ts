import { AppData, DegreeCoefficient } from './types';
import { isValidAcademicYear } from './app-data-validation';

export type CoefficientCopyResult =
  | { ok: true; coefficients: DegreeCoefficient[] }
  | { ok: false; error: string };

export function nextAcademicYear(year: string): string {
  if (!isValidAcademicYear(year)) return '';
  const [start, end] = year.split('-').map(Number);
  if (end >= 9999) return '';
  return `${String(start + 1).padStart(4, '0')}-${String(end + 1).padStart(4, '0')}`;
}

/** Sao chép trọn bộ hệ số bằng cấp sang đúng năm học kế tiếp. */
export function copyDegreeCoefficients(
  data: Pick<AppData, 'degreeCoefficients'>,
  sourceYear: string,
  targetYear: string
): CoefficientCopyResult {
  if (!isValidAcademicYear(sourceYear) || !isValidAcademicYear(targetYear)) {
    return { ok: false, error: 'Năm nguồn và năm đích phải có dạng YYYY-YYYY.' };
  }
  if (nextAcademicYear(sourceYear) !== targetYear) {
    return { ok: false, error: 'Năm đích phải là năm học liền sau năm nguồn.' };
  }
  const source = data.degreeCoefficients.filter((item) => item.year === sourceYear);
  if (source.length === 0) return { ok: false, error: `Không có hệ số nào trong năm ${sourceYear}.` };
  if (data.degreeCoefficients.some((item) => item.year === targetYear)) {
    return { ok: false, error: `Năm ${targetYear} đã có hệ số; không sao chép để tránh ghi đè.` };
  }

  const startYear = targetYear.slice(0, 4);
  const coefficients = source.map((item, index) => ({
    ...item,
    id: `DCOEF-${startYear}-${String(index + 1).padStart(3, '0')}`,
    year: targetYear
  }));
  const normalizedId = (id: string) => id.trim().toLocaleLowerCase('vi');
  const existingIds = new Set(data.degreeCoefficients.map((item) => normalizedId(item.id)));
  if (coefficients.some((item) => existingIds.has(normalizedId(item.id)))) {
    return { ok: false, error: 'Mã hệ số tự sinh đã tồn tại. Hãy kiểm tra dữ liệu năm đích.' };
  }
  return { ok: true, coefficients };
}
