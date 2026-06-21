export const dynamic = 'force-dynamic';

import { EntityCrudPage } from '@/components/EntityCrudPage';

const fields = [
  {
    "name": "id",
    "label": "Mã",
    "type": "text",
    "required": true
  },
  {
    "name": "code",
    "label": "Mã học phần",
    "type": "text",
    "required": true
  },
  {
    "name": "name",
    "label": "Tên học phần",
    "type": "text",
    "required": true
  },
  {
    "name": "credits",
    "label": "Số tín chỉ",
    "type": "number",
    "required": true
  },
  {
    "name": "totalHours",
    "label": "Số tiết",
    "type": "number",
    "required": true
  },
  {
    "name": "coefficient",
    "label": "Hệ số học phần",
    "type": "number",
    "required": true,
    "step": "0.1"
  }
];

export default function Page() {
  return (
    <EntityCrudPage
      entityKey="subjects"
      title="Quản lý Học phần"
      description="Quản lý mã học phần, số tín chỉ, số tiết và hệ số học phần."
      fields={fields as any}
      idPrefix="SUB"
    />
  );
}
