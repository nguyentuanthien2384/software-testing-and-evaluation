import { createHash } from 'node:crypto';
import { AppData } from './types';

/** Phiên bản nội dung giúp phát hiện một tab khác đã lưu dữ liệu mới hơn. */
export function createStateVersion(data: AppData): string {
  // SQLite does not guarantee row order, and JSON object key order is not data.
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  const canonical = Object.fromEntries(Object.entries(data).sort(([left], [right]) => compare(left, right)).map(([key, rows]) => [
    key,
    [...rows].sort((left, right) => compare(left.id, right.id)).map((row) =>
      Object.fromEntries(Object.entries(row).sort(([left], [right]) => compare(left, right))))
  ]));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
