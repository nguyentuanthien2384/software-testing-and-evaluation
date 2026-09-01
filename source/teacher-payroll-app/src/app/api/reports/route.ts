export const dynamic = 'force-dynamic';

import { computePayrollLines } from '@/lib/repository';
import { requirePermission } from '@/lib/session';

export async function GET(request: Request) {
  const authorization = requirePermission(request, 'reports:view');
  if (authorization instanceof Response) return authorization;
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ?? undefined;
    const lines = await computePayrollLines(year);
    const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
    return Response.json({ count: lines.length, totalAmount, lines });
  } catch {
    return Response.json({ error: 'Không thể tạo báo cáo từ dữ liệu hiện tại.' }, { status: 500 });
  }
}
