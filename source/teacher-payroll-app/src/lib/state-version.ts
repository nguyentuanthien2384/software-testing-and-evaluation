import { createHash } from 'node:crypto';
import { AppData } from './types';

/** Phiên bản nội dung giúp phát hiện một tab khác đã lưu dữ liệu mới hơn. */
export function createStateVersion(data: AppData): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
