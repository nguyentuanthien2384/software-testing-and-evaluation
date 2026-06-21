export const dynamic = 'force-dynamic';

import { computePayrollLines } from '@/lib/repository';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ?? undefined;
  const lines = await computePayrollLines(year);
  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  return Response.json({ count: lines.length, totalAmount, lines });
}
