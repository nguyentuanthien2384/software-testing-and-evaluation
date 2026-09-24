import { readSessionUser, SessionConfigurationError } from '@/lib/session';

export async function GET(request: Request) {
  let user;
  try {
    user = readSessionUser(request);
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user });
}
