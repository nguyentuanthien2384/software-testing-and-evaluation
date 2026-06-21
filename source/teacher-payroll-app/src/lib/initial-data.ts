import { AppData } from './types';

export const initialData: AppData = {
  degrees: [
    { id: 'DEG-TS', name: 'Tiến sĩ', shortName: 'TS', coefficient: 2.0, createdAt: '2025-06-21' },
    { id: 'DEG-THS', name: 'Thạc sĩ', shortName: 'ThS', coefficient: 1.5, createdAt: '2025-06-21' },
    { id: 'DEG-KS', name: 'Kỹ sư', shortName: 'KS', coefficient: 1.3, createdAt: '2025-06-21' },
    { id: 'DEG-CN', name: 'Cử nhân', shortName: 'CN', coefficient: 1.1, createdAt: '2025-06-21' }
  ],
  departments: [
    { id: 'DEP-CNTT', code: 'CNTT', name: 'Khoa Công nghệ thông tin', description: 'Đào tạo và nghiên cứu về công nghệ thông tin', createdAt: '2025-06-21' },
    { id: 'DEP-XD', code: 'XD', name: 'Khoa Xây dựng', description: 'Đào tạo về kỹ thuật xây dựng', createdAt: '2025-06-21' },
    { id: 'DEP-DTVT', code: 'DTVT', name: 'Khoa Điện tử - Viễn thông', description: 'Đào tạo về điện tử và viễn thông', createdAt: '2025-06-21' },
    { id: 'DEP-CK', code: 'CK', name: 'Khoa Cơ khí', description: 'Đào tạo về cơ khí và chế tạo máy', createdAt: '2025-06-21' },
    { id: 'DEP-NN', code: 'NN', name: 'Ngoại ngữ', description: 'Đào tạo ngoại ngữ', createdAt: '2025-06-24' }
  ],
  teachers: [
    { id: 'GV0001', fullName: 'Nguyễn Văn An', dateOfBirth: '1980-03-12', phone: '0123456789', email: 'nguyenvanan@example.com', departmentId: 'DEP-CNTT', degreeId: 'DEG-TS', status: 'Đang giảng dạy' },
    { id: 'GV0002', fullName: 'Bùi Thị Hoa', dateOfBirth: '1986-07-05', phone: '0329110240', email: 'buithihoa@example.com', departmentId: 'DEP-XD', degreeId: 'DEG-KS', status: 'Đang giảng dạy' },
    { id: 'GV0003', fullName: 'Đỗ Minh Giang', dateOfBirth: '1982-10-21', phone: '0417266359', email: 'domin hgiang@example.com'.replace(' ', ''), departmentId: 'DEP-XD', degreeId: 'DEG-TS', status: 'Đang giảng dạy' },
    { id: 'GV0004', fullName: 'Phạm Thị Dung', dateOfBirth: '1988-04-11', phone: '0741265963', email: 'phamthidung@example.com', departmentId: 'DEP-DTVT', degreeId: 'DEG-THS', status: 'Đang giảng dạy' },
    { id: 'GV0005', fullName: 'Hoàng Văn Long', dateOfBirth: '1979-12-19', phone: '0952697421', email: 'hoangvanlong@example.com', departmentId: 'DEP-CK', degreeId: 'DEG-TS', status: 'Đang giảng dạy' },
    { id: 'GV0006', fullName: 'Vũ Thị Phương', dateOfBirth: '1985-06-09', phone: '0963714852', email: 'vuthiphuong@example.com', departmentId: 'DEP-CK', degreeId: 'DEG-THS', status: 'Đang giảng dạy' },
    { id: 'GV0007', fullName: 'Lê Minh Cường', dateOfBirth: '1984-09-17', phone: '0385951147', email: 'leminhcuong@example.com', departmentId: 'DEP-DTVT', degreeId: 'DEG-TS', status: 'Đang giảng dạy' },
    { id: 'GV0008', fullName: 'Trần Thị Bình', dateOfBirth: '1983-02-25', phone: '0329110241', email: 'binh.tt@example.edu.vn', departmentId: 'DEP-CNTT', degreeId: 'DEG-THS', status: 'Đang giảng dạy' }
  ],
  subjects: [
    { id: 'SUB-CSDL', code: 'CSDL101', name: 'Cơ sở dữ liệu', credits: 3, totalHours: 45, coefficient: 1.0 },
    { id: 'SUB-WEB', code: 'WEB201', name: 'Lập trình Web', credits: 3, totalHours: 45, coefficient: 1.0 },
    { id: 'SUB-ATTT', code: 'ATTT301', name: 'An toàn thông tin', credits: 3, totalHours: 45, coefficient: 1.2 },
    { id: 'SUB-CTDL', code: 'CTDL102', name: 'Cấu trúc dữ liệu và giải thuật', credits: 4, totalHours: 60, coefficient: 1.2 },
    { id: 'SUB-DIENTU', code: 'DTU101', name: 'Điện tử cơ bản', credits: 3, totalHours: 45, coefficient: 1.0 },
    { id: 'SUB-TKC', code: 'TKC201', name: 'Thiết kế công trình', credits: 3, totalHours: 45, coefficient: 1.1 }
  ],
  semesters: [
    { id: 'SEM-2024-1', name: 'Học kỳ 1', year: '2024-2025', startDate: '2024-09-01', endDate: '2024-12-31' },
    { id: 'SEM-2024-2', name: 'Học kỳ 2', year: '2024-2025', startDate: '2025-01-01', endDate: '2025-05-31' },
    { id: 'SEM-2025-1', name: 'Học kỳ 1', year: '2025-2026', startDate: '2025-09-01', endDate: '2025-12-31' }
  ],
  classes: [
    { id: 'CLS-CSDL-01', code: 'CSDL101.01', subjectId: 'SUB-CSDL', semesterId: 'SEM-2024-1', studentCount: 55, note: 'Lớp chuẩn' },
    { id: 'CLS-WEB-01', code: 'WEB201.01', subjectId: 'SUB-WEB', semesterId: 'SEM-2024-1', studentCount: 82, note: 'Lớp đông' },
    { id: 'CLS-ATTT-01', code: 'ATTT301.01', subjectId: 'SUB-ATTT', semesterId: 'SEM-2024-2', studentCount: 48, note: 'Lớp chuyên ngành' },
    { id: 'CLS-CTDL-02', code: 'CTDL102.02', subjectId: 'SUB-CTDL', semesterId: 'SEM-2024-2', studentCount: 120, note: 'Lớp đông' },
    { id: 'CLS-DTU-01', code: 'DTU101.01', subjectId: 'SUB-DIENTU', semesterId: 'SEM-2025-1', studentCount: 38, note: 'Lớp ít sinh viên' },
    { id: 'CLS-TKC-01', code: 'TKC201.01', subjectId: 'SUB-TKC', semesterId: 'SEM-2025-1', studentCount: 68, note: 'Lớp thường' }
  ],
  assignments: [
    { id: 'ASG-001', teacherId: 'GV0001', classId: 'CLS-CSDL-01', teachingHours: 45, note: 'Phân công chính' },
    { id: 'ASG-002', teacherId: 'GV0008', classId: 'CLS-WEB-01', teachingHours: 45, note: 'Phân công chính' },
    { id: 'ASG-003', teacherId: 'GV0001', classId: 'CLS-ATTT-01', teachingHours: 45, note: 'Phân công chính' },
    { id: 'ASG-004', teacherId: 'GV0004', classId: 'CLS-CTDL-02', teachingHours: 60, note: 'Phân công chính' },
    { id: 'ASG-005', teacherId: 'GV0007', classId: 'CLS-DTU-01', teachingHours: 45, note: 'Phân công chính' },
    { id: 'ASG-006', teacherId: 'GV0002', classId: 'CLS-TKC-01', teachingHours: 45, note: 'Phân công chính' }
  ],
  paymentRates: [
    { id: 'RATE-2024', year: '2024-2025', amount: 143000, effectiveDate: '2024-09-01' },
    { id: 'RATE-2025', year: '2025-2026', amount: 150000, effectiveDate: '2025-09-01' }
  ],
  degreeCoefficients: [
    { id: 'DCOEF-2024-TS', year: '2024-2025', degreeId: 'DEG-TS', coefficient: 2.0 },
    { id: 'DCOEF-2024-THS', year: '2024-2025', degreeId: 'DEG-THS', coefficient: 1.5 },
    { id: 'DCOEF-2024-KS', year: '2024-2025', degreeId: 'DEG-KS', coefficient: 1.3 },
    { id: 'DCOEF-2024-CN', year: '2024-2025', degreeId: 'DEG-CN', coefficient: 1.1 },
    { id: 'DCOEF-2025-TS', year: '2025-2026', degreeId: 'DEG-TS', coefficient: 2.1 },
    { id: 'DCOEF-2025-THS', year: '2025-2026', degreeId: 'DEG-THS', coefficient: 1.6 },
    { id: 'DCOEF-2025-KS', year: '2025-2026', degreeId: 'DEG-KS', coefficient: 1.35 },
    { id: 'DCOEF-2025-CN', year: '2025-2026', degreeId: 'DEG-CN', coefficient: 1.15 }
  ],
  classCoefficients: [
    { id: 'CCOEF-2024-01', year: '2024-2025', minStudents: 0, maxStudents: 40, coefficient: -0.1 },
    { id: 'CCOEF-2024-02', year: '2024-2025', minStudents: 41, maxStudents: 80, coefficient: 0 },
    { id: 'CCOEF-2024-03', year: '2024-2025', minStudents: 81, maxStudents: 120, coefficient: 0.1 },
    { id: 'CCOEF-2024-04', year: '2024-2025', minStudents: 121, maxStudents: 300, coefficient: 0.2 },
    { id: 'CCOEF-2025-01', year: '2025-2026', minStudents: 0, maxStudents: 40, coefficient: -0.1 },
    { id: 'CCOEF-2025-02', year: '2025-2026', minStudents: 41, maxStudents: 80, coefficient: 0 },
    { id: 'CCOEF-2025-03', year: '2025-2026', minStudents: 81, maxStudents: 120, coefficient: 0.1 },
    { id: 'CCOEF-2025-04', year: '2025-2026', minStudents: 121, maxStudents: 300, coefficient: 0.2 }
  ]
};
