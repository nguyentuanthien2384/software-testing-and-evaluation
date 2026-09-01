import { AppData, EntityKey } from './types';
import { validateTeacher } from './payroll';

const ENTITY_KEYS: EntityKey[] = [
  'degrees', 'departments', 'teachers', 'subjects', 'semesters',
  'classes', 'assignments', 'paymentRates', 'degreeCoefficients', 'classCoefficients'
];
const MAX_TEXT_LENGTH = 5000;

export type ValidationResult =
  | { ok: true; data: AppData }
  | { ok: false; errors: string[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('vi') : '';
}

function duplicateValues<T>(rows: T[], value: (row: T) => string): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const current = normalized(value(row));
    if (!current) continue;
    if (seen.has(current)) duplicates.add(current);
    seen.add(current);
  }
  return duplicates;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]);
}

export function isValidAcademicYear(value: string): boolean {
  const match = /^(\d{4})-(\d{4})$/.exec(value.trim());
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

export function getSemesterStatus(
  semester: Pick<AppData['semesters'][number], 'startDate' | 'endDate'>,
  now = new Date()
): 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã kết thúc' | 'Không hợp lệ' {
  if (!isValidIsoDate(semester.startDate) || !isValidIsoDate(semester.endDate)) return 'Không hợp lệ';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start = new Date(`${semester.startDate}T00:00:00`).getTime();
  const end = new Date(`${semester.endDate}T23:59:59`).getTime();
  if (start > end) return 'Không hợp lệ';
  if (today < start) return 'Sắp diễn ra';
  if (today > end) return 'Đã kết thúc';
  return 'Đang diễn ra';
}

/** Kiểm tra toàn bộ snapshot trước khi ghi xuống CSDL. */
export function validateAppData(input: unknown): ValidationResult {
  const object = asRecord(input);
  if (!object) return { ok: false, errors: ['Dữ liệu gửi lên phải là một đối tượng.'] };

  const shapeErrors = ENTITY_KEYS
    .filter((key) => !Array.isArray(object[key]))
    .map((key) => `Trường ${key} phải là một danh sách.`);
  if (shapeErrors.length > 0) return { ok: false, errors: shapeErrors };

  const data = input as AppData;
  const errors: string[] = [];

  for (const key of ENTITY_KEYS) {
    const rows = data[key] as unknown as unknown[];
    rows.forEach((row, index) => {
      const record = asRecord(row);
      if (!record) {
        errors.push(`${key}[${index}] không phải là một bản ghi hợp lệ.`);
        return;
      }
      if (!isNonEmptyString(record.id)) errors.push(`${key}[${index}] thiếu mã định danh.`);
      for (const [field, value] of Object.entries(record)) {
        if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) {
          errors.push(`${key}[${index}].${field} vượt quá ${MAX_TEXT_LENGTH} ký tự.`);
        }
      }
    });
    for (const duplicate of duplicateValues(rows as { id: string }[], (row) => row.id)) {
      errors.push(`Mã ${duplicate} bị trùng trong ${key}.`);
    }
  }

  for (const item of data.degrees) {
    if (!isNonEmptyString(item.name) || !isNonEmptyString(item.shortName)) errors.push(`Bằng cấp ${item.id} thiếu tên hoặc tên viết tắt.`);
    if (!isFiniteNumber(item.coefficient) || item.coefficient <= 0) errors.push(`Hệ số bằng cấp ${item.id} phải lớn hơn 0.`);
    if (!isValidIsoDate(item.createdAt)) errors.push(`Ngày tạo bằng cấp ${item.id} không hợp lệ.`);
  }
  for (const value of duplicateValues(data.degrees, (item) => item.shortName)) errors.push(`Tên viết tắt bằng cấp ${value} đã tồn tại.`);

  for (const item of data.departments) {
    if (!isNonEmptyString(item.code) || !isNonEmptyString(item.name)) errors.push(`Khoa ${item.id} thiếu mã hoặc tên.`);
    if (!isValidIsoDate(item.createdAt)) errors.push(`Ngày tạo khoa ${item.id} không hợp lệ.`);
    if (!['Đang hoạt động', 'Ngừng hoạt động'].includes(item.status)) errors.push(`Trạng thái khoa ${item.id} không hợp lệ.`);
  }
  for (const value of duplicateValues(data.departments, (item) => item.code)) errors.push(`Mã khoa ${value} đã tồn tại.`);

  const degreeIds = new Set(data.degrees.map((item) => item.id));
  const departmentIds = new Set(data.departments.map((item) => item.id));
  for (const item of data.teachers) {
    errors.push(...validateTeacher(item).map((message) => `${item.id}: ${message}`));
    if (!degreeIds.has(item.degreeId)) errors.push(`${item.id}: bằng cấp tham chiếu không tồn tại.`);
    if (!departmentIds.has(item.departmentId)) errors.push(`${item.id}: khoa tham chiếu không tồn tại.`);
    if (!['Đang giảng dạy', 'Tạm nghỉ', 'Nghỉ việc'].includes(item.status)) errors.push(`${item.id}: trạng thái giáo viên không hợp lệ.`);
  }
  for (const value of duplicateValues(data.teachers, (item) => item.email)) errors.push(`Email ${value} đã được dùng bởi nhiều giáo viên.`);
  for (const value of duplicateValues(data.teachers, (item) => item.phone)) errors.push(`Số điện thoại ${value} đã được dùng bởi nhiều giáo viên.`);

  for (const item of data.subjects) {
    if (!isNonEmptyString(item.code) || !isNonEmptyString(item.name)) errors.push(`Học phần ${item.id} thiếu mã hoặc tên.`);
    if (!Number.isInteger(item.credits) || item.credits <= 0) errors.push(`Số tín chỉ của ${item.id} phải là số nguyên lớn hơn 0.`);
    if (!Number.isInteger(item.totalHours) || item.totalHours <= 0) errors.push(`Số tiết của ${item.id} phải là số nguyên lớn hơn 0.`);
    if (!isFiniteNumber(item.coefficient) || item.coefficient <= 0) errors.push(`Hệ số học phần ${item.id} phải lớn hơn 0.`);
  }
  for (const value of duplicateValues(data.subjects, (item) => item.code)) errors.push(`Mã học phần ${value} đã tồn tại.`);

  for (const item of data.semesters) {
    if (!isNonEmptyString(item.name)) errors.push(`Kỳ học ${item.id} thiếu tên.`);
    if (!isValidAcademicYear(item.year)) errors.push(`Năm học của ${item.id} phải có dạng YYYY-YYYY và hai năm liên tiếp.`);
    if (!isValidIsoDate(item.startDate) || !isValidIsoDate(item.endDate)) errors.push(`Ngày của kỳ học ${item.id} không hợp lệ.`);
    else if (item.startDate > item.endDate) errors.push(`Ngày bắt đầu của kỳ học ${item.id} phải trước ngày kết thúc.`);
    if (!['Mở', 'Đã khóa'].includes(item.status)) errors.push(`Trạng thái xử lý của kỳ học ${item.id} không hợp lệ.`);
  }
  for (const value of duplicateValues(data.semesters, (item) => `${item.name}|${item.year}`)) errors.push(`Tên kỳ và năm học ${value} đã tồn tại.`);

  const subjectIds = new Set(data.subjects.map((item) => item.id));
  const semesterIds = new Set(data.semesters.map((item) => item.id));
  for (const item of data.classes) {
    if (!isNonEmptyString(item.code)) errors.push(`Lớp ${item.id} thiếu mã lớp.`);
    if (!subjectIds.has(item.subjectId)) errors.push(`${item.id}: học phần tham chiếu không tồn tại.`);
    if (!semesterIds.has(item.semesterId)) errors.push(`${item.id}: kỳ học tham chiếu không tồn tại.`);
    if (!Number.isInteger(item.studentCount) || item.studentCount < 0) errors.push(`Sĩ số lớp ${item.id} phải là số nguyên không âm.`);
  }
  for (const value of duplicateValues(data.classes, (item) => item.code)) errors.push(`Mã lớp ${value} đã tồn tại.`);

  const teacherIds = new Set(data.teachers.map((item) => item.id));
  const classIds = new Set(data.classes.map((item) => item.id));
  for (const item of data.assignments) {
    if (!teacherIds.has(item.teacherId)) errors.push(`${item.id}: giáo viên tham chiếu không tồn tại.`);
    if (!classIds.has(item.classId)) errors.push(`${item.id}: lớp tham chiếu không tồn tại.`);
    if (!isFiniteNumber(item.teachingHours) || item.teachingHours <= 0) errors.push(`Số tiết của phân công ${item.id} phải lớn hơn 0.`);
  }
  for (const value of duplicateValues(data.assignments, (item) => item.classId)) errors.push(`Lớp ${value} đã được phân công cho giáo viên khác.`);

  for (const item of data.paymentRates) {
    if (!isValidAcademicYear(item.year)) errors.push(`Năm học của định mức ${item.id} không hợp lệ.`);
    if (!isFiniteNumber(item.amount) || item.amount <= 0) errors.push(`Định mức ${item.id} phải lớn hơn 0.`);
    if (!isValidIsoDate(item.effectiveDate)) errors.push(`Ngày hiệu lực của ${item.id} không hợp lệ.`);
  }
  for (const value of duplicateValues(data.paymentRates, (item) => item.year)) errors.push(`Định mức năm ${value} đã tồn tại.`);

  for (const item of data.degreeCoefficients) {
    if (!isValidAcademicYear(item.year)) errors.push(`Năm học của hệ số ${item.id} không hợp lệ.`);
    if (!degreeIds.has(item.degreeId)) errors.push(`${item.id}: bằng cấp tham chiếu không tồn tại.`);
    if (!isFiniteNumber(item.coefficient) || item.coefficient <= 0) errors.push(`Hệ số giáo viên ${item.id} phải lớn hơn 0.`);
  }
  for (const value of duplicateValues(data.degreeCoefficients, (item) => `${item.year}|${item.degreeId}`)) errors.push(`Hệ số giáo viên ${value} đã tồn tại.`);

  const rangesByYear = new Map<string, AppData['classCoefficients']>();
  for (const item of data.classCoefficients) {
    if (!isValidAcademicYear(item.year)) errors.push(`Năm học của hệ số lớp ${item.id} không hợp lệ.`);
    if (!Number.isInteger(item.minStudents) || item.minStudents < 0) errors.push(`Sĩ số từ của ${item.id} phải là số nguyên không âm.`);
    if (!Number.isInteger(item.maxStudents) || item.maxStudents < item.minStudents) errors.push(`Sĩ số đến của ${item.id} phải lớn hơn hoặc bằng sĩ số từ.`);
    if (!isFiniteNumber(item.coefficient)) errors.push(`Hệ số lớp ${item.id} phải là một số.`);
    const rows = rangesByYear.get(item.year) ?? [];
    rows.push(item);
    rangesByYear.set(item.year, rows);
  }
  for (const [year, ranges] of rangesByYear) {
    const sorted = [...ranges].sort((a, b) => a.minStudents - b.minStudents);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].minStudents <= sorted[index - 1].maxStudents) errors.push(`Khoảng sĩ số năm ${year} bị chồng lấn.`);
      else if (sorted[index].minStudents !== sorted[index - 1].maxStudents + 1) errors.push(`Khoảng sĩ số năm ${year} bị gián đoạn.`);
    }
  }

  for (const assignment of data.assignments) {
    const teachingClass = data.classes.find((item) => item.id === assignment.classId);
    const subject = teachingClass ? data.subjects.find((item) => item.id === teachingClass.subjectId) : undefined;
    const semester = teachingClass ? data.semesters.find((item) => item.id === teachingClass.semesterId) : undefined;
    const classCoefficient = teachingClass && semester
      ? data.classCoefficients.find((item) => item.year === semester.year && teachingClass.studentCount >= item.minStudents && teachingClass.studentCount <= item.maxStudents)
      : undefined;
    if (subject && classCoefficient && subject.coefficient + classCoefficient.coefficient <= 0) {
      errors.push(`${assignment.id}: tổng hệ số học phần và hệ số lớp phải lớn hơn 0.`);
    }
  }

  return errors.length > 0
    ? { ok: false, errors: Array.from(new Set(errors)) }
    : { ok: true, data };
}

/** Kiểm tra một thao tác thêm/sửa bằng cùng bộ quy tắc với API. */
export function validateEntityMutation(
  entityKey: EntityKey,
  row: Record<string, string | number>,
  data: AppData,
  editingId: string | null
): string[] {
  if (editingId && row.id !== editingId) return ['Không được thay đổi mã định danh khi chỉnh sửa.'];
  if (entityKey === 'teachers') {
    const department = data.departments.find((item) => item.id === row.departmentId);
    if (department?.status === 'Ngừng hoạt động') return ['Không thể xếp giáo viên vào khoa đã ngừng hoạt động.'];
  }
  if (entityKey === 'classes') {
    const semester = data.semesters.find((item) => item.id === row.semesterId);
    if (semester?.status === 'Đã khóa') return ['Không thể thêm hoặc sửa lớp thuộc kỳ học đã khóa.'];
  }
  if (entityKey === 'assignments') {
    const teachingClass = data.classes.find((item) => item.id === row.classId);
    const semester = teachingClass ? data.semesters.find((item) => item.id === teachingClass.semesterId) : undefined;
    if (semester?.status === 'Đã khóa') return ['Không thể thay đổi phân công của kỳ học đã khóa.'];
  }
  const currentRows = data[entityKey] as unknown as Record<string, string | number>[];
  const nextRows = editingId
    ? currentRows.map((item) => item.id === editingId ? row : item)
    : [...currentRows, row];
  const result = validateAppData({ ...data, [entityKey]: nextRows });
  return result.ok ? [] : result.errors;
}
