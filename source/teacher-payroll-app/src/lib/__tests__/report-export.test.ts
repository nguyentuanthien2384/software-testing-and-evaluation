import { calculateAllPayrollLines } from '../payroll';
import { buildPayrollCsv } from '../report-export';
import { initialData } from '../initial-data';

describe('xuất báo cáo CSV', () => {
  test('có BOM UTF-8, tiếng Việt và cột tiết quy đổi đúng với bảng', () => {
    const line = calculateAllPayrollLines(initialData)[0];
    const csv = buildPayrollCsv([line]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Tiết quy đổi"');
    expect(csv).toContain(`"${line.convertedHours}"`);
    expect(csv).toContain('"Giáo viên"');
    expect(csv).toContain('\r\n');
  });

  test('vô hiệu hoá công thức bảng tính do nội dung người dùng nhập', () => {
    const line = { ...calculateAllPayrollLines(initialData)[0], teacherName: '=HYPERLINK("bad")' };
    expect(buildPayrollCsv([line])).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
