import { TeachingClass } from './types';

export type ClassBatchResult =
  | { ok: true; classes: TeachingClass[] }
  | { ok: false; error: string };

function incrementTrailingNumber(value: string, offset: number): string | null {
  const match = /^(.*?)(\d+)$/.exec(value);
  if (!match) return null;
  return `${match[1]}${String(BigInt(match[2]) + BigInt(offset)).padStart(match[2].length, '0')}`;
}

function normalizedCode(value: string): string {
  return value.trim().toLocaleLowerCase('vi');
}

/** Tạo một lô lớp từ mã đầu tiên, giữ nguyên số chữ số ở phần thứ tự. */
export function buildTeachingClassBatch(
  base: TeachingClass,
  count: number,
  existing: Pick<TeachingClass, 'id' | 'code'>[]
): ClassBatchResult {
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    return { ok: false, error: 'Số lượng lớp phải là số nguyên từ 1 đến 50.' };
  }
  const classes: TeachingClass[] = [];
  const existingIds = new Set(existing.map((item) => normalizedCode(item.id)));
  const existingCodes = new Set(existing.map((item) => normalizedCode(item.code)));
  const generatedIds = new Set<string>();
  const generatedCodes = new Set<string>();
  for (let offset = 0; offset < count; offset += 1) {
    const id = count === 1 ? base.id : incrementTrailingNumber(base.id, offset);
    const code = count === 1 ? base.code : incrementTrailingNumber(base.code, offset);
    if (!id || !code) {
      return { ok: false, error: 'Khi tạo nhiều lớp, mã bản ghi và mã lớp phải kết thúc bằng số thứ tự.' };
    }
    const normalizedId = normalizedCode(id);
    const normalizedClassCode = normalizedCode(code);
    if (existingIds.has(normalizedId) || existingCodes.has(normalizedClassCode) || generatedIds.has(normalizedId) || generatedCodes.has(normalizedClassCode)) {
      return { ok: false, error: `Không thể tạo lô vì mã ${id} hoặc ${code} đã tồn tại.` };
    }
    generatedIds.add(normalizedId);
    generatedCodes.add(normalizedClassCode);
    classes.push({ ...base, id, code });
  }
  return { ok: true, classes };
}
