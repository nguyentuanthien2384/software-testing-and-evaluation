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
    "name": "teacherId",
    "label": "Giáo viên",
    "type": "select",
    "required": true,
    "optionsSource": "teachers",
    "optionLabelFields": [
      "id",
      "fullName"
    ]
  },
  {
    "name": "classId",
    "label": "Lớp học phần",
    "type": "select",
    "required": true,
    "optionsSource": "classes",
    "optionLabelFields": [
      "code"
    ]
  },
  {
    "name": "teachingHours",
    "label": "Số tiết",
    "type": "number",
    "required": true
  },
  {
    "name": "note",
    "label": "Ghi chú",
    "type": "textarea",
    "required": false
  }
];

export default function Page() {
  return (
    <EntityCrudPage
      entityKey="assignments"
      title="Phân công giảng viên"
      description="Gán giáo viên cho lớp học phần và nhập số tiết giảng dạy."
      fields={fields as any}
      idPrefix="ASG"
    />
  );
}
