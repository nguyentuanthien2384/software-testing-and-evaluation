import { buildTeachingClassBatch } from '../class-generation';
import { initialData } from '../initial-data';

const base = {
  id: 'CLS-007',
  code: 'CSDL101.07',
  subjectId: 'SUB-CSDL',
  semesterId: 'SEM-2025-1',
  studentCount: 40,
  note: ''
};

describe('tạo nhiều lớp học phần', () => {
  test('tăng đúng mã bản ghi và mã lớp', () => {
    const result = buildTeachingClassBatch(base, 3, initialData.classes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.classes.map((item) => item.id)).toEqual(['CLS-007', 'CLS-008', 'CLS-009']);
      expect(result.classes.map((item) => item.code)).toEqual(['CSDL101.07', 'CSDL101.08', 'CSDL101.09']);
    }
  });

  test('từ chối số lượng ngoài giới hạn', () => {
    expect(buildTeachingClassBatch(base, 0, []).ok).toBe(false);
    expect(buildTeachingClassBatch(base, 51, []).ok).toBe(false);
    expect(buildTeachingClassBatch(base, 1.5, []).ok).toBe(false);
    expect(buildTeachingClassBatch(base, Number.NaN, []).ok).toBe(false);
  });

  test('cho phép một lớp không có hậu tố số nhưng vẫn kiểm tra mã trùng', () => {
    const single = { ...base, id: 'CLS-CSDL', code: 'CSDL101' };
    expect(buildTeachingClassBatch(single, 1, [])).toEqual({ ok: true, classes: [single] });
    expect(buildTeachingClassBatch(single, 1, [{ id: 'cls-csdl', code: 'OTHER' }]).ok).toBe(false);
    expect(buildTeachingClassBatch(single, 1, [{ id: 'OTHER', code: 'csdl101' }]).ok).toBe(false);
  });

  test('từ chối khi mã trong lô đụng dữ liệu có sẵn', () => {
    const result = buildTeachingClassBatch(base, 2, [{ id: 'CLS-008', code: 'OTHER.01' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('đã tồn tại');
  });

  test('yêu cầu hậu tố số khi tạo nhiều lớp', () => {
    expect(buildTeachingClassBatch({ ...base, code: 'CSDL' }, 2, []).ok).toBe(false);
    expect(buildTeachingClassBatch({ ...base, id: 'CLS-CSDL' }, 2, []).ok).toBe(false);
  });

  test('kiểm tra mã bản ghi trùng không phân biệt chữ hoa thường', () => {
    expect(buildTeachingClassBatch(base, 2, [{ id: 'cls-008', code: 'OTHER' }]).ok).toBe(false);
  });

  test('giữ nguyên dữ liệu gốc, sinh đủ giới hạn 50 lớp và xử lý hậu tố rất lớn', () => {
    const original = { ...base, id: 'CLS-9007199254740992', code: 'CSDL.9007199254740992' };
    const snapshot = structuredClone(original);
    const result = buildTeachingClassBatch(original, 50, []);
    expect(result.ok).toBe(true);
    expect(original).toEqual(snapshot);
    if (result.ok) {
      expect(result.classes).toHaveLength(50);
      expect(result.classes[1].id).toBe('CLS-9007199254740993');
      expect(result.classes[49].code).toBe('CSDL.9007199254741041');
      expect(new Set(result.classes.map((item) => item.id)).size).toBe(50);
      expect(result.classes.every((item) => item.subjectId === original.subjectId && item.studentCount === original.studentCount)).toBe(true);
    }
  });
});
