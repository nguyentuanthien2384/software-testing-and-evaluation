export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { initialData } from '@/lib/initial-data';

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany();
    return Response.json(teachers.length ? teachers : initialData.teachers);
  } catch {
    return Response.json(initialData.teachers);
  }
}
