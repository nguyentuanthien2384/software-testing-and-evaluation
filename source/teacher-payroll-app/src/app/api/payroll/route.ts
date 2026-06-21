export const dynamic = 'force-dynamic';

import { calculateTeachingPay } from '@/lib/payroll';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = calculateTeachingPay({
      hours: Number(body.hours),
      subjectCoef: Number(body.subjectCoef),
      classCoef: Number(body.classCoef),
      rate: Number(body.rate),
      degreeCoef: Number(body.degreeCoef)
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }
}

export async function GET() {
  return Response.json({ formula: 'Số tiết × (Hệ số học phần + Hệ số lớp) × Định mức × Hệ số bằng cấp' });
}
