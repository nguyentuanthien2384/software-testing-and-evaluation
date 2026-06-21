export const dynamic = 'force-dynamic';

import { EntityCrudPage } from '@/components/EntityCrudPage';

const fields = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'year', label: 'Năm học', type: 'text', required: true },
  { name: 'minStudents', label: 'Sĩ số từ', type: 'number', required: true },
  { name: 'maxStudents', label: 'Sĩ số đến', type: 'number', required: true },
  { name: 'coefficient', label: 'Hệ số lớp', type: 'number', required: true, step: '0.1' }
];

export default function Page() {
  return <EntityCrudPage entityKey="classCoefficients" title="Thiết lập Hệ số lớp" description="Quản lý hệ số lớp học phần theo khoảng sĩ số." fields={fields as any} idPrefix="CCOEF" />;
}
