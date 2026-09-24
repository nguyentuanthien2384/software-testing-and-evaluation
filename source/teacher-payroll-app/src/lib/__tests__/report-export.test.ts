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

  test.each([' =1+1', '\t+SUM(1,2)', '\r\n@cmd', '\uFEFF-1'])('vô hiệu hoá công thức có tiền tố khoảng trắng hoặc ký tự điều khiển %p', (teacherName) => {
    const line = { ...calculateAllPayrollLines(initialData)[0], teacherName };
    expect(buildPayrollCsv([line])).toContain(`"'${teacherName}"`);
  });

  test('giữ dữ liệu CSV hợp lệ khi tên chứa dấu phẩy, ngoặc kép và xuống dòng', () => {
    const line = { ...calculateAllPayrollLines(initialData)[0], teacherName: 'Lan, "An"\r\nNguyen' };
    expect(buildPayrollCsv([line])).toContain('"Lan, ""An""\r\nNguyen"');
  });

  test('xuất báo cáo rỗng với hàng tiêu đề duy nhất', () => {
    expect(buildPayrollCsv([])).toBe('\uFEFF"Mã GV","Giáo viên","Khoa","Năm học","Lớp","Học phần","Số tiết","Tiết quy đổi","Tiền dạy"');
  });
});
