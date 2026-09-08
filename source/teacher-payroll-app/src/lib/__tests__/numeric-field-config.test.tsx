import type { ReactElement } from 'react';
import AssignmentsPage from '../../app/assignments/page';
import ClassCoefficientsPage from '../../app/class-coefficients/page';
import ClassesPage from '../../app/classes/page';
import DegreesPage from '../../app/degrees/page';
import PaymentRatesPage from '../../app/payment-rates/page';
import SubjectsPage from '../../app/subjects/page';
import TeacherCoefficientsPage from '../../app/teacher-coefficients/page';
import type { FieldConfig } from '../../components/EntityCrudPage';

type CrudPageElement = ReactElement<{ fields: FieldConfig[] }>;

function numericField(page: () => ReactElement, fieldName: string): FieldConfig | undefined {
  const fields = (page() as CrudPageElement).props.fields;
  return fields.find((field) => field.name === fieldName);
}

describe('cấu hình trường số sau bản cập nhật ràng buộc dữ liệu', () => {
  test.each([
    ['bằng cấp', DegreesPage, 'coefficient', '0.1', '0.1'],
    ['tín chỉ học phần', SubjectsPage, 'credits', '1', '1'],
    ['số tiết học phần', SubjectsPage, 'totalHours', '1', '1'],
    ['hệ số học phần', SubjectsPage, 'coefficient', '0.1', '0.1'],
    ['sĩ số lớp', ClassesPage, 'studentCount', '1', '1'],
    ['số tiết phân công', AssignmentsPage, 'teachingHours', '0.01', '0.01'],
    ['định mức tiết', PaymentRatesPage, 'amount', '1', '1'],
    ['hệ số giáo viên', TeacherCoefficientsPage, 'coefficient', '0.01', '0.01'],
    ['sĩ số dưới của khoảng', ClassCoefficientsPage, 'minStudents', '1', '1'],
    ['sĩ số trên của khoảng', ClassCoefficientsPage, 'maxStudents', '1', '1'],
    ['hệ số lớp', ClassCoefficientsPage, 'coefficient', '0.1', '0.1']
  ] as const)('%s dùng đúng giới hạn và bước nhập', (_label, page, fieldName, min, step) => {
    expect(numericField(page, fieldName)).toMatchObject({
      type: 'number',
      required: true,
      min,
      step
    });
  });
});
