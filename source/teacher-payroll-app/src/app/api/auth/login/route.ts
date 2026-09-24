import { authenticate } from '@/lib/auth-server';
import { createSessionToken, SessionConfigurationError, sessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Yêu cầu đăng nhập không hợp lệ.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ ok: false, error: 'Yêu cầu đăng nhập không hợp lệ.' }, { status: 400 });
  }
  const credentials = body as { username?: unknown; password?: unknown };

  const result = authenticate(
    typeof credentials.username === 'string' ? credentials.username : '',
    typeof credentials.password === 'string' ? credentials.password : ''
  );
  if (!result.ok) return Response.json(result, { status: 401 });

  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const useSecureCookie = forwardedProtocol === 'https' || new URL(request.url).protocol === 'https:';
  let token: string;
  try {
    token = createSessionToken(result.user);
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      return Response.json({ ok: false, error: error.message }, { status: 503 });
    }
    throw error;
  }
  return Response.json(result, {
    headers: { 'Set-Cookie': sessionCookie(token, useSecureCookie) }
  });
}
