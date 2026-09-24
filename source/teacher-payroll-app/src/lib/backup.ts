import { validateAppData, ValidationResult } from './app-data-validation';
import { AppData } from './types';

export const BACKUP_FORMAT = 'teacher-payroll-backup';
export const BACKUP_VERSION = 1;

export type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: AppData;
};

/** Tạo tệp backup có định dạng rõ ràng để tránh khôi phục nhầm JSON khác. */
export function createBackup(data: AppData, exportedAt = new Date().toISOString()): string {
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    data
  };
  return JSON.stringify(envelope, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Đọc và kiểm tra backup trước khi gửi snapshot xuống API. */
export function parseBackup(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Tệp backup không phải JSON hợp lệ.'] };
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    return { ok: false, errors: ['Tệp backup không đúng định dạng của hệ thống.'] };
  }
  if (parsed.version !== BACKUP_VERSION) {
    return { ok: false, errors: [`Phiên bản backup ${String(parsed.version ?? '') || 'không xác định'} không được hỗ trợ.`] };
  }
  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt))) {
    return { ok: false, errors: ['Tệp backup thiếu thời điểm xuất hợp lệ.'] };
  }

  return validateAppData(parsed.data);
}
