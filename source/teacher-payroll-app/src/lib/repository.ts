import { prisma } from './db';
import { AppData, PayrollLine } from './types';
import { calculatePayrollLine } from './payroll';

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
    degrees,
    departments: departments.map((item) => ({ ...item, status: item.status as AppData['departments'][number]['status'] })),
    teachers: teachers.map((t) => ({ ...t, status: t.status as AppData['teachers'][number]['status'] })),
    subjects,
    semesters: semesters.map((item) => ({ ...item, status: item.status as AppData['semesters'][number]['status'] })),
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
  const assignments = year
    ? data.assignments.filter((assignment) => {
        const teachingClass = data.classes.find((item) => item.id === assignment.classId);
        const semester = teachingClass
          ? data.semesters.find((item) => item.id === teachingClass.semesterId)
          : undefined;
        // Giữ bản ghi không xác định được năm để hàm tính bên dưới báo lỗi tham chiếu rõ ràng.
        return !semester || semester.year === year;
      })
    : data.assignments;

  return assignments.map((assignment) => calculatePayrollLine(data, assignment));
}
