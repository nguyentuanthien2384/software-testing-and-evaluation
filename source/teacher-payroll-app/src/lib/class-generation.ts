import { TeachingClass } from './types';

export type ClassBatchResult =
  | { ok: true; classes: TeachingClass[] }
  | { ok: false; error: string };

function incrementTrailingNumber(value: string, offset: number): string | null {
  const match = /^(.*?)(\d+)$/.exec(value);
  if (!match) return null;
  return `${match[1]}${String(Number(match[2]) + offset).padStart(match[2].length, '0')}`;
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
  if (count === 1) return { ok: true, classes: [base] };

  const classes: TeachingClass[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const id = incrementTrailingNumber(base.id, offset);
    const code = incrementTrailingNumber(base.code, offset);
    if (!id || !code) {
      return { ok: false, error: 'Khi tạo nhiều lớp, mã bản ghi và mã lớp phải kết thúc bằng số thứ tự.' };
    }
    if (existing.some((item) => item.id === id || item.code.toLocaleLowerCase('vi') === code.toLocaleLowerCase('vi'))) {
      return { ok: false, error: `Không thể tạo lô vì mã ${id} hoặc ${code} đã tồn tại.` };
    }
    classes.push({ ...base, id, code });
  }
  return { ok: true, classes };
}
