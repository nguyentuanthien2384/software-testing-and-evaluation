import {
  AppData,
  Assignment,
  ClassCoefficient,
  Degree,
  PayrollInput,
  PayrollLine,
  PayrollResult,
  Teacher,
  TeachingClass
} from './types';

export function assertPositiveNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} phải là số không âm.`);
  }
}

export function calculateTeachingPay(input: PayrollInput): PayrollResult {
  assertPositiveNumber(input.hours, 'Số tiết');
  assertPositiveNumber(input.subjectCoef, 'Hệ số học phần');
  assertPositiveNumber(input.rate, 'Định mức');
  assertPositiveNumber(input.degreeCoef, 'Hệ số bằng cấp');
  if (!Number.isFinite(input.classCoef)) {
    throw new Error('Hệ số lớp phải là số.');
  }

  const convertedHours = round(input.hours * (input.subjectCoef + input.classCoef), 2);
  if (convertedHours < 0) {
    throw new Error('Tiết quy đổi không được âm. Kiểm tra lại hệ số học phần và hệ số lớp.');
  }
  const amount = round(convertedHours * input.rate * input.degreeCoef, 0);
  return { convertedHours, amount };
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function findPaymentRate(data: AppData, year: string): number {
  const rate = data.paymentRates.find((item) => item.year === year);
  if (!rate) throw new Error(`Chưa thiết lập định mức tiền tiết cho năm học ${year}.`);
  return rate.amount;
}

export function findDegreeCoefficient(data: AppData, degreeId: string, year: string): number {
  const custom = data.degreeCoefficients.find((item) => item.degreeId === degreeId && item.year === year);
  if (custom) return custom.coefficient;

  const degree = data.degrees.find((item) => item.id === degreeId);
  if (!degree) throw new Error('Không tìm thấy bằng cấp của giáo viên.');
  return degree.coefficient;
}

export function findClassCoefficient(coefficients: ClassCoefficient[], year: string, studentCount: number): number {
  const matched = coefficients.find(
    (item) => item.year === year && studentCount >= item.minStudents && studentCount <= item.maxStudents
  );
  if (!matched) throw new Error(`Chưa thiết lập hệ số lớp cho sĩ số ${studentCount} trong năm học ${year}.`);
  return matched.coefficient;
}

export function getAge(dateOfBirth: string, now = new Date()): number {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return 0;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function validateTeacher(teacher: Teacher): string[] {
  const errors: string[] = [];
  if (!teacher.fullName.trim()) errors.push('Họ tên giáo viên là bắt buộc.');
  if (!/^0\d{9}$/.test(teacher.phone)) errors.push('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacher.email)) errors.push('Email không hợp lệ.');
  const age = getAge(teacher.dateOfBirth);
  if (age < 22 || age > 70) errors.push('Tuổi giáo viên phải trong khoảng 22 đến 70.');
  if (!teacher.departmentId) errors.push('Phải chọn khoa.');
  if (!teacher.degreeId) errors.push('Phải chọn bằng cấp.');
  return errors;
}

export function generateNextTeacherCode(teachers: Pick<Teacher, 'id'>[]): string {
  const max = teachers.reduce((currentMax, item) => {
    const number = Number(item.id.replace(/^GV/, ''));
    return Number.isFinite(number) ? Math.max(currentMax, number) : currentMax;
  }, 0);
  return `GV${String(max + 1).padStart(4, '0')}`;
}

export function calculatePayrollLine(data: AppData, assignment: Assignment): PayrollLine {
  const teacher = required(data.teachers.find((item) => item.id === assignment.teacherId), 'Không tìm thấy giáo viên.');
  const teachingClass = required(data.classes.find((item) => item.id === assignment.classId), 'Không tìm thấy lớp học phần.');
  const subject = required(data.subjects.find((item) => item.id === teachingClass.subjectId), 'Không tìm thấy học phần.');
  const semester = required(data.semesters.find((item) => item.id === teachingClass.semesterId), 'Không tìm thấy kỳ học.');
  const degree = required(data.degrees.find((item) => item.id === teacher.degreeId), 'Không tìm thấy bằng cấp.');
  const department = required(data.departments.find((item) => item.id === teacher.departmentId), 'Không tìm thấy khoa.');

  const paymentRate = findPaymentRate(data, semester.year);
  const degreeCoefficient = findDegreeCoefficient(data, teacher.degreeId, semester.year);
  const classCoefficient = findClassCoefficient(data.classCoefficients, semester.year, teachingClass.studentCount);
  const result = calculateTeachingPay({
    hours: assignment.teachingHours,
    subjectCoef: subject.coefficient,
    classCoef: classCoefficient,
    rate: paymentRate,
    degreeCoef: degreeCoefficient
  });

  return {
    assignmentId: assignment.id,
    teacherId: teacher.id,
    teacherName: teacher.fullName,
    departmentName: department.name,
    degreeName: degree.shortName,
    semesterName: `${semester.name} ${semester.year}`,
    year: semester.year,
    classCode: teachingClass.code,
    subjectName: subject.name,
    teachingHours: assignment.teachingHours,
    subjectCoefficient: subject.coefficient,
    classCoefficient,
    paymentRate,
    degreeCoefficient,
    convertedHours: result.convertedHours,
    amount: result.amount
  };
}

export function calculateAllPayrollLines(data: AppData): PayrollLine[] {
  return data.assignments.map((assignment) => calculatePayrollLine(data, assignment));
}

export function filterPayrollLines(lines: PayrollLine[], filters: { year?: string; teacherId?: string; departmentName?: string; semesterName?: string }): PayrollLine[] {
  return lines.filter((line) => {
    if (filters.year && line.year !== filters.year) return false;
    if (filters.teacherId && line.teacherId !== filters.teacherId) return false;
    if (filters.departmentName && line.departmentName !== filters.departmentName) return false;
    if (filters.semesterName && line.semesterName !== filters.semesterName) return false;
    return true;
  });
}

export function sumAmount(lines: PayrollLine[]): number {
  return round(lines.reduce((sum, line) => sum + line.amount, 0), 0);
}

export function groupAmountBy(lines: PayrollLine[], key: keyof Pick<PayrollLine, 'teacherName' | 'departmentName' | 'year' | 'semesterName'>): { name: string; amount: number; count: number }[] {
  const map = new Map<string, { name: string; amount: number; count: number }>();
  for (const line of lines) {
    const name = String(line[key]);
    const current = map.get(name) ?? { name, amount: 0, count: 0 };
    current.amount += line.amount;
    current.count += 1;
    map.set(name, current);
  }
  return Array.from(map.values())
    .map((item) => ({ ...item, amount: round(item.amount, 0) }))
    .sort((a, b) => b.amount - a.amount);
}

export function teacherHasRelatedData(teacherId: string, assignments: Assignment[]): boolean {
  return assignments.some((assignment) => assignment.teacherId === teacherId);
}

export function degreeHasRelatedData(degreeId: string, teachers: Teacher[]): boolean {
  return teachers.some((teacher) => teacher.degreeId === degreeId);
}

export function departmentHasRelatedData(departmentId: string, teachers: Teacher[]): boolean {
  return teachers.some((teacher) => teacher.departmentId === departmentId);
}

export function classHasRelatedData(classId: string, assignments: Assignment[]): boolean {
  return assignments.some((assignment) => assignment.classId === classId);
}

function required<T>(value: T | undefined, message: string): T {
  if (!value) throw new Error(message);
  return value;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}
