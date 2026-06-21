export const dynamic = 'force-dynamic';

import { getAllData, replaceAllData } from '@/lib/repository';
import { initialData } from '@/lib/initial-data';
import { AppData } from '@/lib/types';

// GET: nạp toàn bộ dữ liệu từ SQLite. Nếu CSDL chưa migrate -> trả dữ liệu mẫu.
export async function GET() {
  try {
    const data = await getAllData();
    const empty = Object.values(data).every((arr) => Array.isArray(arr) && arr.length === 0);
    return Response.json(empty ? initialData : data);
  } catch {
    return Response.json(initialData);
  }
}

// PUT: lưu (ghi đè) toàn bộ dữ liệu xuống SQLite.
export async function PUT(request: Request) {
  try {
    const data = (await request.json()) as AppData;
    await replaceAllData(data);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Không thể lưu dữ liệu.' },
      { status: 500 }
    );
  }
}
