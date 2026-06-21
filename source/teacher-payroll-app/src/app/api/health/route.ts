export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ status: 'ok', service: 'teacher-payroll-app', version: '3.0.0' });
}
