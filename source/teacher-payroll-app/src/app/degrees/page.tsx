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
    "name": "name",
    "label": "Tên đầy đủ",
    "type": "text",
    "required": true
  },
  {
    "name": "shortName",
    "label": "Tên viết tắt",
    "type": "text",
    "required": true
  },
  {
    "name": "coefficient",
    "label": "Hệ số",
    "type": "number",
    "required": true,
    "step": "0.1"
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
      entityKey="degrees"
      title="Quản lý Bằng cấp"
      description="Thêm, sửa, xoá, tìm kiếm danh mục bằng cấp và hệ số mặc định."
      fields={fields as any}
      idPrefix="DEG"
    />
  );
}
