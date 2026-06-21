import { PrismaClient } from '@prisma/client';
import { initialData } from '../src/lib/initial-data';

const prisma = new PrismaClient();

async function main() {
  // Xoá dữ liệu cũ theo đúng thứ tự khoá ngoại
  await prisma.assignment.deleteMany();
  await prisma.teachingClass.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.degreeCoefficient.deleteMany();
  await prisma.classCoefficient.deleteMany();
  await prisma.paymentRate.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.department.deleteMany();
  await prisma.degree.deleteMany();

  // Nạp dữ liệu mẫu (đúng thứ tự phụ thuộc)
  await prisma.degree.createMany({ data: initialData.degrees });
  await prisma.department.createMany({ data: initialData.departments });
  await prisma.subject.createMany({ data: initialData.subjects });
  await prisma.semester.createMany({ data: initialData.semesters });
  await prisma.paymentRate.createMany({ data: initialData.paymentRates });
  await prisma.classCoefficient.createMany({ data: initialData.classCoefficients });
  await prisma.teacher.createMany({ data: initialData.teachers });
  await prisma.degreeCoefficient.createMany({ data: initialData.degreeCoefficients });
  await prisma.teachingClass.createMany({ data: initialData.classes });
  await prisma.assignment.createMany({ data: initialData.assignments });

  console.log('Seed thành công: đã nạp dữ liệu mẫu vào SQLite.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
