import { prisma } from './db';
import { AppData, PayrollLine } from './types';
import {
  calculateTeachingPay,
  findClassCoefficient,
  findDegreeCoefficient,
  findPaymentRate
} from './payroll';

/** Đọc toàn bộ dữ liệu từ CSDL SQLite và trả về đúng cấu trúc AppData mà UI dùng. */
export async function getAllData(): Promise<AppData> {
  const [
    degrees, departments, teachers, subjects, semesters,
    classes, assignments, paymentRates, degreeCoefficients, classCoefficients
  ] = await Promise.all([
    prisma.degree.findMany(),
    prisma.department.findMany(),
    prisma.teacher.findMany(),
    prisma.subject.findMany(),
    prisma.semester.findMany(),
    prisma.teachingClass.findMany(),
    prisma.assignment.findMany(),
    prisma.paymentRate.findMany(),
    prisma.degreeCoefficient.findMany(),
    prisma.classCoefficient.findMany()
  ]);
  return {
    degrees, departments,
    teachers: teachers.map((t) => ({ ...t, status: t.status as AppData['teachers'][number]['status'] })),
    subjects, semesters,
    classes, assignments, paymentRates, degreeCoefficients, classCoefficients
  };
}

/** Ghi đè toàn bộ dữ liệu (write-through) trong 1 transaction để đảm bảo toàn vẹn. */
export async function replaceAllData(data: AppData): Promise<void> {
  await prisma.$transaction([
    prisma.assignment.deleteMany(),
    prisma.teachingClass.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.degreeCoefficient.deleteMany(),
    prisma.classCoefficient.deleteMany(),
    prisma.paymentRate.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.semester.deleteMany(),
    prisma.department.deleteMany(),
    prisma.degree.deleteMany(),
    prisma.degree.createMany({ data: data.degrees }),
    prisma.department.createMany({ data: data.departments }),
    prisma.subject.createMany({ data: data.subjects }),
    prisma.semester.createMany({ data: data.semesters }),
    prisma.paymentRate.createMany({ data: data.paymentRates }),
    prisma.classCoefficient.createMany({ data: data.classCoefficients }),
    prisma.teacher.createMany({ data: data.teachers }),
    prisma.degreeCoefficient.createMany({ data: data.degreeCoefficients }),
    prisma.teachingClass.createMany({ data: data.classes }),
    prisma.assignment.createMany({ data: data.assignments })
  ]);
}

/** Tính bảng lương toàn trường trực tiếp từ dữ liệu CSDL (phục vụ API báo cáo). */
export async function computePayrollLines(year?: string): Promise<PayrollLine[]> {
  const data = await getAllData();
  const lines: PayrollLine[] = [];
  for (const a of data.assignments) {
    const cls = data.classes.find((c) => c.id === a.classId);
    if (!cls) continue;
    const subject = data.subjects.find((s) => s.id === cls.subjectId);
    const semester = data.semesters.find((s) => s.id === cls.semesterId);
    const teacher = data.teachers.find((t) => t.id === a.teacherId);
    if (!subject || !semester || !teacher) continue;
    if (year && semester.year !== year) continue;
    const department = data.departments.find((d) => d.id === teacher.departmentId);
    const degree = data.degrees.find((d) => d.id === teacher.degreeId);
    try {
      const rate = findPaymentRate(data, semester.year);
      const degreeCoef = findDegreeCoefficient(data, teacher.degreeId, semester.year);
      const classCoef = findClassCoefficient(data.classCoefficients, semester.year, cls.studentCount);
      const { convertedHours, amount } = calculateTeachingPay({
        hours: a.teachingHours,
        subjectCoef: subject.coefficient,
        classCoef,
        rate,
        degreeCoef
      });
      lines.push({
        assignmentId: a.id, teacherId: teacher.id, teacherName: teacher.fullName,
        departmentName: department?.name ?? '', degreeName: degree?.name ?? '',
        semesterName: semester.name, year: semester.year, classCode: cls.code,
        subjectName: subject.name, teachingHours: a.teachingHours,
        subjectCoefficient: subject.coefficient, classCoefficient: classCoef,
        paymentRate: rate, degreeCoefficient: degreeCoef, convertedHours, amount
      });
    } catch {
      // thiếu định mức/hệ số cho năm học -> bỏ qua dòng, báo cáo sẽ phản ánh thiếu dữ liệu
    }
  }
  return lines;
}
