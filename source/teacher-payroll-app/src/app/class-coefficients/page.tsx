export const dynamic = 'force-dynamic';

import { EntityCrudPage } from '@/components/EntityCrudPage';

const fields = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'year', label: 'Năm học', type: 'text', required: true },
  { name: 'minStudents', label: 'Sĩ số từ', type: 'number', required: true, min: '1', step: '1' },
  { name: 'maxStudents', label: 'Sĩ số đến', type: 'number', required: true, min: '1', step: '1' },
  {
    name: 'coefficient',
    label: 'Hệ số lớp',
    type: 'number',
    required: true,
    min: '0.1',
    step: '0.1',
    numberFormat: { minimumFractionDigits: 1, maximumFractionDigits: 1 }
  }
];

export default function Page() {
  return <EntityCrudPage entityKey="classCoefficients" title="Thiết lập Hệ số lớp" description="Hệ số lớp được nhân với hệ số học phần và phải lớn hơn 0." fields={fields as any} idPrefix="CCOEF" />;
}
