import { PayrollLine } from './types';

function safeCsvCell(value: string | number): string {
  let text = String(value);
  // Ngăn Excel/LibreOffice diễn giải nội dung do người dùng nhập thành công thức.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildPayrollCsv(lines: PayrollLine[]): string {
  const header = ['Mã GV', 'Giáo viên', 'Khoa', 'Năm học', 'Lớp', 'Học phần', 'Số tiết', 'Tiết quy đổi', 'Tiền dạy'];
  const body = lines.map((line) => [
    line.teacherId,
    line.teacherName,
    line.departmentName,
    line.year,
    line.classCode,
    line.subjectName,
    line.teachingHours,
    line.convertedHours,
    line.amount
  ]);
  const content = [header, ...body].map((row) => row.map(safeCsvCell).join(',')).join('\r\n');
  return `\uFEFF${content}`;
}
