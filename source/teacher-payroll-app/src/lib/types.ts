export type EntityKey =
  | 'degrees'
  | 'departments'
  | 'teachers'
  | 'subjects'
  | 'semesters'
  | 'classes'
  | 'assignments'
  | 'paymentRates'
  | 'degreeCoefficients'
  | 'classCoefficients';

export type Degree = {
  id: string;
  name: string;
  shortName: string;
  coefficient: number;
  createdAt: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
};

export type Teacher = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  departmentId: string;
  degreeId: string;
  status: 'Đang giảng dạy' | 'Tạm nghỉ' | 'Nghỉ việc';
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  credits: number;
  totalHours: number;
  coefficient: number;
};

export type Semester = {
  id: string;
  name: string;
  year: string;
  startDate: string;
  endDate: string;
};

export type TeachingClass = {
  id: string;
  code: string;
  subjectId: string;
  semesterId: string;
  studentCount: number;
  note: string;
};

export type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  teachingHours: number;
  note: string;
};

export type PaymentRate = {
  id: string;
  year: string;
  amount: number;
  effectiveDate: string;
};

export type DegreeCoefficient = {
  id: string;
  year: string;
  degreeId: string;
  coefficient: number;
};

export type ClassCoefficient = {
  id: string;
  year: string;
  minStudents: number;
  maxStudents: number;
  coefficient: number;
};

export type AppData = {
  degrees: Degree[];
  departments: Department[];
  teachers: Teacher[];
  subjects: Subject[];
  semesters: Semester[];
  classes: TeachingClass[];
  assignments: Assignment[];
  paymentRates: PaymentRate[];
  degreeCoefficients: DegreeCoefficient[];
  classCoefficients: ClassCoefficient[];
};

export type PayrollLine = {
  assignmentId: string;
  teacherId: string;
  teacherName: string;
  departmentName: string;
  degreeName: string;
  semesterName: string;
  year: string;
  classCode: string;
  subjectName: string;
  teachingHours: number;
  subjectCoefficient: number;
  classCoefficient: number;
  paymentRate: number;
  degreeCoefficient: number;
  convertedHours: number;
  amount: number;
};

export type PayrollInput = {
  hours: number;
  subjectCoef: number;
  classCoef: number;
  rate: number;
  degreeCoef: number;
};

export type PayrollResult = {
  convertedHours: number;
  amount: number;
};
