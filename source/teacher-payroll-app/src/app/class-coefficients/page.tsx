export const dynamic = 'force-dynamic';

import { EntityCrudPage } from '@/components/EntityCrudPage';

const fields = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'year', label: 'Năm học', type: 'text', required: true },
  { name: 'minStudents', label: 'Sĩ số từ', type: 'number', required: true, min: '0' },
  { name: 'maxStudents', label: 'Sĩ số đến', type: 'number', required: true, min: '0' },
  {
    name: 'coefficient',
    label: 'Điều chỉnh',
    type: 'number',
    required: true,
    step: '0.1',
    numberFormat: { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }
  }
];

export default function Page() {
  return <EntityCrudPage entityKey="classCoefficients" title="Thiết lập Hệ số lớp" description="Mức điều chỉnh được cộng vào hệ số học phần: số âm là giảm, 0 là giữ nguyên và số dương là tăng." fields={fields as any} idPrefix="CCOEF" />;
}
