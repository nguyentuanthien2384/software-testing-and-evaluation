import { readSessionUser } from '@/lib/session';

export async function GET(request: Request) {
  const user = readSessionUser(request);
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user });
}
