import { isNonNegativeNumericDraft, parseNumericDraft } from '../numeric-input';

describe('parseNumericDraft', () => {
  test.each([
    [',5', 0.5],
    ['0', 0],
    ['0.', 0],
    ['12.5', 12.5],
    ['12,5', 12.5],
    [12.5, 12.5]
  ])('đọc số thập phân %p', (value, expected) => {
    expect(parseNumericDraft(value)).toBe(expected);
  });

  test.each(['', '   ', '-', '-0.1', '+', '+12.5', '0x10', '1e3', '143.000,5', '1,2,3'])('từ chối định dạng nhập mơ hồ hoặc số có dấu %p', (value) => {
    expect(parseNumericDraft(value)).toBeNaN();
  });

  test.each([Number.NaN, Number.POSITIVE_INFINITY, -1])('từ chối giá trị number không hợp lệ %p', (value) => {
    expect(parseNumericDraft(value)).toBeNaN();
  });
});

describe('isNonNegativeNumericDraft', () => {
  test.each(['', '0', '0.', '0,', '.5', ',5', '12.50'])('cho phép trạng thái nhập số thập phân %p', (value) => {
    expect(isNonNegativeNumericDraft(value)).toBe(true);
  });

  test.each(['-', '-0.1', '+1', 'abc', '1e3', '1.2.3', '1,2,3', ' 1'])('chặn dấu và ký tự không phải số %p', (value) => {
    expect(isNonNegativeNumericDraft(value)).toBe(false);
  });
});
