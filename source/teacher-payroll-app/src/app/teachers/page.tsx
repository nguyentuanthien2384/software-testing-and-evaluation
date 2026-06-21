export const dynamic = 'force-dynamic';

import { EntityCrudPage } from '@/components/EntityCrudPage';

const fields = [
  {
    "name": "id",
    "label": "Mã GV",
    "type": "text",
    "required": true
  },
  {
    "name": "fullName",
    "label": "Họ và tên",
    "type": "text",
    "required": true
  },
  {
    "name": "dateOfBirth",
    "label": "Ngày sinh",
    "type": "date",
    "required": true
  },
  {
    "name": "phone",
    "label": "Số điện thoại",
    "type": "text",
    "required": true
  },
  {
    "name": "email",
    "label": "Email",
    "type": "email",
    "required": true
  },
  {
    "name": "departmentId",
    "label": "Khoa",
    "type": "select",
    "required": true,
    "optionsSource": "departments",
    "optionLabelFields": [
      "code",
      "name"
    ]
  },
  {
    "name": "degreeId",
    "label": "Bằng cấp",
    "type": "select",
    "required": true,
    "optionsSource": "degrees",
    "optionLabelFields": [
      "shortName",
      "name"
    ]
  },
  {
    "name": "status",
    "label": "Trạng thái",
    "type": "select",
    "required": true,
    "options": [
      {
        "value": "Đang giảng dạy",
        "label": "Đang giảng dạy"
      },
      {
        "value": "Tạm nghỉ",
        "label": "Tạm nghỉ"
      },
      {
        "value": "Nghỉ việc",
        "label": "Nghỉ việc"
      }
    ]
  }
];

export default function Page() {
  return (
    <EntityCrudPage
      entityKey="teachers"
      title="Quản lý Giáo viên"
      description="Quản lý hồ sơ giáo viên, khoa, bằng cấp, email và số điện thoại."
      fields={fields as any}
      idPrefix="GV"
    />
  );
}
