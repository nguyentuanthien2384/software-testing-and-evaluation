export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { initialData } from '@/lib/initial-data';
import { requirePermission } from '@/lib/session';

export async function GET(request: Request) {
  const authorization = requirePermission(request, 'data:view');
  if (authorization instanceof Response) return authorization;
  try {
    const teachers = await prisma.teacher.findMany();
    return Response.json(teachers.length ? teachers : initialData.teachers);
  } catch {
    return Response.json({ error: 'Không thể đọc danh sách giáo viên.' }, { status: 503 });
  }
}
