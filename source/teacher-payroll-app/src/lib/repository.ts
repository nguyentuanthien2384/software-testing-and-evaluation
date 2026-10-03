import { prisma } from './db';
import { AppData, PayrollLine } from './types';
import { calculatePayrollLine } from './payroll';
import type { Prisma } from '@prisma/client';
import { initialData } from './initial-data';

/** Đọc toàn bộ dữ liệu từ CSDL SQLite và trả về đúng cấu trúc AppData mà UI dùng. */
export async function getAllData(): Promise<AppData> {
  // Batch transactions keep a consistent snapshot entirely in the query engine.
  // Interactive read callbacks can exhaust SQLite's pool under concurrent GETs.
  return mapDatabaseRows(await prisma.$transaction([...readOperations(prisma)]));
}

async function readAllData(database: Prisma.TransactionClient): Promise<AppData> {
  return mapDatabaseRows(await Promise.all(readOperations(database)));
}

function readOperations(database: Prisma.TransactionClient) {
  return [
    database.degree.findMany(),
    database.department.findMany(),
    database.teacher.findMany(),
    database.subject.findMany(),
    database.semester.findMany(),
    database.teachingClass.findMany(),
    database.assignment.findMany(),
    database.paymentRate.findMany(),
    database.degreeCoefficient.findMany(),
    database.classCoefficient.findMany()
  ] as const;
}

type AwaitedTuple<T extends readonly unknown[]> = { [K in keyof T]: Awaited<T[K]> };

function mapDatabaseRows(rows: AwaitedTuple<ReturnType<typeof readOperations>>): AppData {
  const [
    degrees, departments, teachers, subjects, semesters,
    classes, assignments, paymentRates, degreeCoefficients, classCoefficients
  ] = rows;
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
  await prisma.$transaction(writeOperations(prisma, data));
}

function writeOperations(database: Prisma.TransactionClient, data: AppData) {
  return [
    database.assignment.deleteMany(),
    database.teachingClass.deleteMany(),
    database.teacher.deleteMany(),
    database.degreeCoefficient.deleteMany(),
    database.classCoefficient.deleteMany(),
    database.paymentRate.deleteMany(),
    database.subject.deleteMany(),
    database.semester.deleteMany(),
    database.department.deleteMany(),
    database.degree.deleteMany(),
    database.degree.createMany({ data: data.degrees }),
    database.department.createMany({ data: data.departments }),
    database.subject.createMany({ data: data.subjects }),
    database.semester.createMany({ data: data.semesters }),
    database.paymentRate.createMany({ data: data.paymentRates }),
    database.classCoefficient.createMany({ data: data.classCoefficients }),
    database.teacher.createMany({ data: data.teachers }),
    database.degreeCoefficient.createMany({ data: data.degreeCoefficients }),
    database.teachingClass.createMany({ data: data.classes }),
    database.assignment.createMany({ data: data.assignments })
  ];
}

/** Khóa ghi SQLite trước khi đọc/version-check để nhiều worker không ghi đè nhau. */
export async function withStateTransaction<T>(
  operation: (current: AppData, save: (data: AppData) => Promise<void>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (transaction) => {
    // A no-op UPDATE acquires SQLite's writer reservation, including an empty database.
    await transaction.$executeRaw`UPDATE "Degree" SET "id" = "id" WHERE 0`;
    const stored = await readAllData(transaction);
    const current = Object.values(stored).every((rows) => rows.length === 0) ? initialData : stored;
    return operation(current, async (data) => {
      for (const query of writeOperations(transaction, data)) await query;
    });
  }, { maxWait: 10_000, timeout: 15_000 });
}

/** Tính bảng lương toàn trường trực tiếp từ dữ liệu CSDL (phục vụ API báo cáo). */
export async function computePayrollLines(year?: string): Promise<PayrollLine[]> {
  const stored = await getAllData();
  const data = Object.values(stored).every((rows) => rows.length === 0) ? initialData : stored;
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
