export const dynamic = 'force-dynamic';

import { getAllData, replaceAllData } from '@/lib/repository';
import { initialData } from '@/lib/initial-data';
import { validateAppData } from '@/lib/app-data-validation';
import { requirePermission } from '@/lib/session';
import { createStateVersion } from '@/lib/state-version';

const VERSION_HEADER = 'X-State-Version';
let writeQueue: Promise<unknown> = Promise.resolve();

async function currentState() {
  const stored = await getAllData();
  const empty = Object.values(stored).every((rows) => rows.length === 0);
  return empty ? initialData : stored;
}

function runWriteExclusively<T>(operation: () => Promise<T>): Promise<T> {
  const pending = writeQueue.then(operation, operation);
  writeQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

// GET: nạp toàn bộ dữ liệu từ SQLite; lỗi CSDL được trả rõ ràng, không giả làm dữ liệu mẫu.
export async function GET(request: Request) {
  const authorization = requirePermission(request, 'data:view');
  if (authorization instanceof Response) return authorization;
  try {
    const data = await currentState();
    return Response.json(data, { headers: { [VERSION_HEADER]: createStateVersion(data) } });
  } catch {
    return Response.json({ error: 'Không thể đọc dữ liệu từ cơ sở dữ liệu.' }, { status: 503 });
  }
}

// PUT: lưu (ghi đè) toàn bộ dữ liệu xuống SQLite.
export async function PUT(request: Request) {
  const authorization = requirePermission(request, 'data:manage');
  if (authorization instanceof Response) return authorization;

  try {
    const validation = validateAppData(await request.json());
    if (!validation.ok) {
      return Response.json({ ok: false, error: validation.errors[0], errors: validation.errors }, { status: 400 });
    }

    const expectedVersion = request.headers.get(VERSION_HEADER);
    if (!expectedVersion) {
      return Response.json({ ok: false, error: 'Thiếu phiên bản dữ liệu. Hãy tải lại trang.' }, { status: 428 });
    }

    return await runWriteExclusively(async () => {
      const current = await currentState();
      if (createStateVersion(current) !== expectedVersion) {
        return Response.json(
          { ok: false, error: 'Dữ liệu đã được thay đổi ở nơi khác. Hãy tải lại trang trước khi lưu.' },
          { status: 409 }
        );
      }
      await replaceAllData(validation.data);
      const nextVersion = createStateVersion(validation.data);
      return Response.json({ ok: true }, { headers: { [VERSION_HEADER]: nextVersion } });
    });
  } catch {
    return Response.json({ ok: false, error: 'Không thể lưu dữ liệu vào cơ sở dữ liệu.' }, { status: 500 });
  }
}
