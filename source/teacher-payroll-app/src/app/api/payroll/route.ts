export const dynamic = 'force-dynamic';

import { calculateTeachingPay } from '@/lib/payroll';
import { parseNumericDraft } from '@/lib/numeric-input';
import { requirePermission } from '@/lib/session';

function parsePayrollNumber(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return Number.NaN;
  return parseNumericDraft(value);
}

export async function POST(request: Request) {
  const authorization = requirePermission(request, 'payroll:calculate');
  if (authorization instanceof Response) return authorization;
  try {
    const body = await request.json();
    const result = calculateTeachingPay({
      hours: parsePayrollNumber(body?.hours),
      subjectCoef: parsePayrollNumber(body?.subjectCoef),
      classCoef: parsePayrollNumber(body?.classCoef),
      rate: parsePayrollNumber(body?.rate),
      degreeCoef: parsePayrollNumber(body?.degreeCoef)
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const authorization = requirePermission(request, 'payroll:calculate');
  if (authorization instanceof Response) return authorization;
  return Response.json({ formula: 'Số tiết × Hệ số học phần × Hệ số lớp × Định mức × Hệ số bằng cấp' });
}
