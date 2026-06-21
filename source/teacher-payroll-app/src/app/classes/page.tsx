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
    "label": "Mã lớp",
    "type": "text",
    "required": true
  },
  {
    "name": "subjectId",
    "label": "Học phần",
    "type": "select",
    "required": true,
    "optionsSource": "subjects",
    "optionLabelFields": [
      "code",
      "name"
    ]
  },
  {
    "name": "semesterId",
    "label": "Kỳ học",
    "type": "select",
    "required": true,
    "optionsSource": "semesters",
    "optionLabelFields": [
      "name",
      "year"
    ]
  },
  {
    "name": "studentCount",
    "label": "Sĩ số",
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
      entityKey="classes"
      title="Quản lý Lớp học phần"
      description="Quản lý lớp học phần, học phần, kỳ học và sĩ số."
      fields={fields as any}
      idPrefix="CLS"
    />
  );
}
