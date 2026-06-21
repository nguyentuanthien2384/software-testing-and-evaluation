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
    "label": "Viết tắt",
    "type": "text",
    "required": true
  },
  {
    "name": "name",
    "label": "Tên khoa",
    "type": "text",
    "required": true
  },
  {
    "name": "description",
    "label": "Mô tả",
    "type": "textarea",
    "required": false
  },
  {
    "name": "createdAt",
    "label": "Ngày tạo",
    "type": "date",
    "required": true
  }
];

export default function Page() {
  return (
    <EntityCrudPage
      entityKey="departments"
      title="Quản lý Khoa"
      description="Quản lý thông tin khoa, mã khoa và mô tả nhiệm vụ."
      fields={fields as any}
      idPrefix="DEP"
    />
  );
}
