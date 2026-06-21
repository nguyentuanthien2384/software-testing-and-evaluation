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
    "name": "year",
    "label": "Năm học",
    "type": "text",
    "required": true
  },
  {
    "name": "amount",
    "label": "Định mức VND/tiết",
    "type": "number",
    "required": true
  },
  {
    "name": "effectiveDate",
    "label": "Ngày hiệu lực",
    "type": "date",
    "required": true
  }
];

export default function Page() {
  return (
    <EntityCrudPage
      entityKey="paymentRates"
      title="Thiết lập Định mức tiết"
      description="Quản lý định mức tiền trên mỗi tiết theo năm học."
      fields={fields as any}
      idPrefix="RATE"
    />
  );
}
