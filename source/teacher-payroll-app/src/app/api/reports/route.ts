export const dynamic = 'force-dynamic';

import { computePayrollLines } from '@/lib/repository';
import { requirePermission } from '@/lib/session';
import { isValidAcademicYear } from '@/lib/app-data-validation';

export async function GET(request: Request) {
  const authorization = requirePermission(request, 'reports:view');
  if (authorization instanceof Response) return authorization;
  try {
    const { searchParams } = new URL(request.url);
    const requestedYear = searchParams.get('year');
    const year = requestedYear === null ? undefined : requestedYear.trim();
    if (year !== undefined && !isValidAcademicYear(year)) {
      return Response.json({ error: 'Năm học phải có dạng YYYY-YYYY và hai năm liên tiếp.' }, { status: 400 });
    }
    const lines = await computePayrollLines(year);
    const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
    return Response.json({ count: lines.length, totalAmount, lines });
  } catch {
    return Response.json({ error: 'Không thể tạo báo cáo từ dữ liệu hiện tại.' }, { status: 500 });
  }
}
