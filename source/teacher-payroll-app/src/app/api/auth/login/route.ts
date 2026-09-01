import { authenticate } from '@/lib/auth-server';
import { createSessionToken, sessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Yêu cầu đăng nhập không hợp lệ.' }, { status: 400 });
  }

  const result = authenticate(
    typeof body.username === 'string' ? body.username : '',
    typeof body.password === 'string' ? body.password : ''
  );
  if (!result.ok) return Response.json(result, { status: 401 });

  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const useSecureCookie = forwardedProtocol === 'https' || new URL(request.url).protocol === 'https:';
  return Response.json(result, {
    headers: { 'Set-Cookie': sessionCookie(createSessionToken(result.user), useSecureCookie) }
  });
}
