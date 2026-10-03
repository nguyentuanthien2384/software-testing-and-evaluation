import { createStateVersion } from '../state-version';
import { initialData } from '../initial-data';

describe('phiên bản snapshot dữ liệu', () => {
  test('cùng nội dung tạo cùng phiên bản và thay đổi nội dung tạo phiên bản khác', () => {
    const original = createStateVersion(initialData);
    expect(createStateVersion(structuredClone(initialData))).toBe(original);

    const changed = structuredClone(initialData);
    changed.degrees[0].coefficient += 0.1;
    expect(createStateVersion(changed)).not.toBe(original);
  });

  test('không phụ thuộc thứ tự JSON keys hoặc thứ tự bản ghi SQLite', () => {
    const reordered = Object.fromEntries(Object.entries(initialData).reverse().map(([key, rows]) => [
      key,
      [...rows].reverse().map((row) => Object.fromEntries(Object.entries(row).reverse()))
    ])) as unknown as typeof initialData;
    expect(createStateVersion(reordered)).toBe(createStateVersion(initialData));
  });
});
