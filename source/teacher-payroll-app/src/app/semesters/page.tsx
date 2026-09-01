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
    "label": "Tên kỳ",
    "type": "text",
    "required": true
  },
  {
    "name": "year",
    "label": "Năm học",
    "type": "text",
    "required": true
  },
  {
    "name": "startDate",
    "label": "Ngày bắt đầu",
    "type": "date",
    "required": true
  },
  {
    "name": "endDate",
    "label": "Ngày kết thúc",
    "type": "date",
    "required": true
  },
  {
    "name": "status",
    "label": "Xử lý",
    "type": "select",
    "required": true,
    "options": [
      { "value": "Mở", "label": "Mở" },
      { "value": "Đã khóa", "label": "Đã khóa" }
    ]
  },
  {
    "name": "periodStatus",
    "label": "Tiến độ",
    "type": "text",
    "tableOnly": true
  }
];

export default function Page() {
  return (
    <EntityCrudPage
      entityKey="semesters"
      title="Quản lý Kỳ học"
      description="Thêm, sửa, xoá và tìm kiếm kỳ học theo năm học."
      fields={fields as any}
      idPrefix="SEM"
    />
  );
}
