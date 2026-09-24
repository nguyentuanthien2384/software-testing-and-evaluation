import { createBackup, parseBackup } from '../backup';
import { initialData } from '../initial-data';

describe('backup dữ liệu', () => {
  test('tạo envelope có phiên bản và thời điểm xuất ổn định', () => {
    const text = createBackup(initialData, '2026-09-24T10:00:00.000Z');
    const parsed = JSON.parse(text) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      format: 'teacher-payroll-backup',
      version: 1,
      exportedAt: '2026-09-24T10:00:00.000Z',
      data: initialData
    });
  });

  test('đọc được backup hợp lệ và giữ nguyên snapshot', () => {
    const result = parseBackup(createBackup(initialData, '2026-09-24T10:00:00.000Z'));
    expect(result).toEqual({ ok: true, data: initialData });
  });

  test.each([
    ['JSON hỏng', '{', 'Tệp backup không phải JSON hợp lệ.'],
    ['sai định dạng', JSON.stringify({ format: 'other', version: 1 }), 'Tệp backup không đúng định dạng của hệ thống.'],
    ['sai phiên bản', JSON.stringify({ format: 'teacher-payroll-backup', version: 2, exportedAt: '2026-09-24T10:00:00.000Z', data: initialData }), 'Phiên bản backup 2 không được hỗ trợ.'],
    ['thiếu phiên bản', JSON.stringify({ format: 'teacher-payroll-backup', exportedAt: '2026-09-24T10:00:00.000Z', data: initialData }), 'Phiên bản backup không xác định không được hỗ trợ.'],
    ['thiếu thời điểm', JSON.stringify({ format: 'teacher-payroll-backup', version: 1, data: initialData }), 'Tệp backup thiếu thời điểm xuất hợp lệ.'],
    ['thời điểm sai', JSON.stringify({ format: 'teacher-payroll-backup', version: 1, exportedAt: 'not-a-date', data: initialData }), 'Tệp backup thiếu thời điểm xuất hợp lệ.']
  ])('từ chối %s trước khi khôi phục', (_case, text, expected) => {
    expect(parseBackup(text)).toEqual({ ok: false, errors: [expected] });
  });

  test('dùng chung bộ kiểm tra snapshot để từ chối backup có dữ liệu sai', () => {
    const invalid = structuredClone(initialData);
    invalid.teachers[0].email = 'not-an-email';
    const result = parseBackup(createBackup(invalid));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('GV0001: Email không hợp lệ.');
  });
});
