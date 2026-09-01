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
  });

  test('từ chối khi mã trong lô đụng dữ liệu có sẵn', () => {
    const result = buildTeachingClassBatch(base, 2, [{ id: 'CLS-008', code: 'OTHER.01' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('đã tồn tại');
  });

  test('yêu cầu hậu tố số khi tạo nhiều lớp', () => {
    expect(buildTeachingClassBatch({ ...base, code: 'CSDL' }, 2, []).ok).toBe(false);
  });
});
