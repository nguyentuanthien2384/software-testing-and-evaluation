import { parseNumericDraft } from '../numeric-input';

describe('parseNumericDraft', () => {
  test.each([
    ['-0.1', -0.1],
    ['-0,1', -0.1],
    [',5', 0.5],
    ['+12.5', 12.5],
    [12.5, 12.5]
  ])('đọc số thập phân %p', (value, expected) => {
    expect(parseNumericDraft(value)).toBe(expected);
  });

  test.each(['', '   ', '-', '+', '0x10', '1e3', '143.000,5', '1,2,3'])('từ chối định dạng nhập mơ hồ %p', (value) => {
    expect(parseNumericDraft(value)).toBeNaN();
  });
});
