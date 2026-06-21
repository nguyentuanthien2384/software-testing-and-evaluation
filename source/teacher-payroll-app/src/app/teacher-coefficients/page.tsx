export const dynamic = 'force-dynamic';

import { EntityCrudPage } from '@/components/EntityCrudPage';

const fields = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'year', label: 'Năm học', type: 'text', required: true },
  { name: 'degreeId', label: 'Bằng cấp', type: 'select', required: true, optionsSource: 'degrees', optionLabelFields: ['shortName', 'name'] },
  { name: 'coefficient', label: 'Hệ số', type: 'number', required: true, step: '0.1' }
];

export default function Page() {
  return <EntityCrudPage entityKey="degreeCoefficients" title="Thiết lập Hệ số giáo viên" description="Quản lý hệ số giáo viên theo bằng cấp và năm học." fields={fields as any} idPrefix="DCOEF" />;
}
