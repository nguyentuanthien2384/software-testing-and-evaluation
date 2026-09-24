export const dynamic = 'force-dynamic';

import { initialData } from '@/lib/initial-data';
import { getAllData } from '@/lib/repository';
import { requirePermission } from '@/lib/session';

export async function GET(request: Request) {
  const authorization = requirePermission(request, 'data:view');
  if (authorization instanceof Response) return authorization;
  try {
    const data = await getAllData();
    const empty = Object.values(data).every((rows) => rows.length === 0);
    return Response.json(empty ? initialData.teachers : data.teachers);
  } catch {
    return Response.json({ error: 'Không thể đọc danh sách giáo viên.' }, { status: 503 });
  }
}
