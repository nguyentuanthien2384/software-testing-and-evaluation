import { prisma } from '../db';
import { initialData } from '../initial-data';
import { calculateAllPayrollLines } from '../payroll';
import { computePayrollLines, replaceAllData } from '../repository';

jest.mock('../db', () => {
  const model = () => ({ findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() });
  return {
    prisma: {
      degree: model(),
      department: model(),
      teacher: model(),
      subject: model(),
      semester: model(),
      teachingClass: model(),
      assignment: model(),
      paymentRate: model(),
      degreeCoefficient: model(),
      classCoefficient: model(),
      $transaction: jest.fn()
    }
  };
});

type ModelMock = {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
  createMany: jest.Mock;
};

const mockedPrisma = prisma as unknown as {
  degree: ModelMock;
  department: ModelMock;
  teacher: ModelMock;
  subject: ModelMock;
  semester: ModelMock;
  teachingClass: ModelMock;
  assignment: ModelMock;
  paymentRate: ModelMock;
  degreeCoefficient: ModelMock;
  classCoefficient: ModelMock;
  $transaction: jest.Mock;
};

function mockDatabaseData() {
  mockedPrisma.degree.findMany.mockResolvedValue(initialData.degrees);
  mockedPrisma.department.findMany.mockResolvedValue(initialData.departments);
  mockedPrisma.teacher.findMany.mockResolvedValue(initialData.teachers);
  mockedPrisma.subject.findMany.mockResolvedValue(initialData.subjects);
  mockedPrisma.semester.findMany.mockResolvedValue(initialData.semesters);
  mockedPrisma.teachingClass.findMany.mockResolvedValue(initialData.classes);
  mockedPrisma.assignment.findMany.mockResolvedValue(initialData.assignments);
  mockedPrisma.paymentRate.findMany.mockResolvedValue(initialData.paymentRates);
  mockedPrisma.degreeCoefficient.findMany.mockResolvedValue(initialData.degreeCoefficients);
  mockedPrisma.classCoefficient.findMany.mockResolvedValue(initialData.classCoefficients);
}

describe('computePayrollLines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabaseData();
  });

  test('trả cùng kết quả với luồng tính bảng lương dùng tại giao diện', async () => {
    await expect(computePayrollLines()).resolves.toEqual(calculateAllPayrollLines(initialData));
  });

  test('lọc chính xác theo năm học', async () => {
    const expected = calculateAllPayrollLines(initialData).filter((line) => line.year === '2024-2025');
    await expect(computePayrollLines('2024-2025')).resolves.toEqual(expected);
  });

  test('không tính dữ liệu lỗi thuộc năm học khác khi đang lọc báo cáo', async () => {
    mockedPrisma.assignment.findMany.mockResolvedValue(
      initialData.assignments.map((assignment) =>
        assignment.id === 'ASG-005'
          ? { ...assignment, teacherId: 'GV-KHONG-TON-TAI' }
          : assignment
      )
    );
    const expected = calculateAllPayrollLines(initialData).filter((line) => line.year === '2024-2025');

    await expect(computePayrollLines('2024-2025')).resolves.toEqual(expected);
  });

  test('báo lỗi dữ liệu tham chiếu hỏng thay vì âm thầm bỏ dòng', async () => {
    mockedPrisma.assignment.findMany.mockResolvedValue([
      { ...initialData.assignments[0], teacherId: 'GV-KHONG-TON-TAI' }
    ]);

    await expect(computePayrollLines()).rejects.toThrow('Không tìm thấy giáo viên');
  });
});

describe('replaceAllData', () => {
  test('ghi dữ liệu trong một transaction và đúng thứ tự phụ thuộc chính', async () => {
    mockedPrisma.$transaction.mockResolvedValue([]);

    await replaceAllData(initialData);

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.$transaction.mock.calls[0][0]).toHaveLength(20);
    expect(mockedPrisma.degree.createMany).toHaveBeenCalledWith({ data: initialData.degrees });
    expect(mockedPrisma.teacher.createMany).toHaveBeenCalledWith({ data: initialData.teachers });
    expect(mockedPrisma.assignment.createMany).toHaveBeenCalledWith({ data: initialData.assignments });
    expect(mockedPrisma.assignment.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(mockedPrisma.teacher.deleteMany.mock.invocationCallOrder[0]);
    expect(mockedPrisma.degree.createMany.mock.invocationCallOrder[0])
      .toBeLessThan(mockedPrisma.teacher.createMany.mock.invocationCallOrder[0]);
    expect(mockedPrisma.teacher.createMany.mock.invocationCallOrder[0])
      .toBeLessThan(mockedPrisma.assignment.createMany.mock.invocationCallOrder[0]);
  });
});
