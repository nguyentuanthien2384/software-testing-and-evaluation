import { GET, PUT } from '../../app/api/state/route';
import { getAllData, replaceAllData } from '../repository';
import { initialData } from '../initial-data';
import { createSessionToken, SESSION_COOKIE } from '../session';
import { createStateVersion } from '../state-version';
import type { AppData } from '../types';

jest.mock('../repository', () => ({
  getAllData: jest.fn(),
  replaceAllData: jest.fn()
}));

const getAllDataMock = getAllData as jest.MockedFunction<typeof getAllData>;
const replaceAllDataMock = replaceAllData as jest.MockedFunction<typeof replaceAllData>;
const adminCookie = `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken({
  username: 'admin', displayName: 'Quản trị viên', role: 'admin'
}))}`;

function request(method: 'GET' | 'PUT', data?: unknown, version?: string): Request {
  return new Request('http://localhost/api/state', {
    method,
    headers: {
      cookie: adminCookie,
      'Content-Type': 'application/json',
      ...(version ? { 'X-State-Version': version } : {})
    },
    ...(method === 'PUT' ? { body: JSON.stringify(data) } : {})
  });
}

describe('API state', () => {
  let stored: AppData;

  beforeEach(() => {
    jest.resetAllMocks();
    stored = structuredClone(initialData);
    getAllDataMock.mockImplementation(async () => structuredClone(stored));
    replaceAllDataMock.mockImplementation(async (next) => { stored = structuredClone(next); });
  });

  test('GET trả snapshot và phiên bản tương ứng', async () => {
    const response = await GET(request('GET'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-State-Version')).toBe(createStateVersion(stored));
    await expect(response.json()).resolves.toEqual(stored);
  });

  test('GET chỉ dùng dữ liệu mẫu khi toàn bộ CSDL trống', async () => {
    getAllDataMock.mockResolvedValue(Object.fromEntries(
      Object.keys(initialData).map((key) => [key, []])
    ) as unknown as AppData);
    const response = await GET(request('GET'));
    await expect(response.json()).resolves.toEqual(initialData);
    expect(response.headers.get('X-State-Version')).toBe(createStateVersion(initialData));
  });

  test('GET báo lỗi đọc CSDL thay vì trả dữ liệu mẫu', async () => {
    getAllDataMock.mockRejectedValue(new Error('database offline'));
    const response = await GET(request('GET'));
    expect(response.status).toBe(503);
  });

  test('PUT yêu cầu phiên bản trước khi ghi', async () => {
    const response = await PUT(request('PUT', stored));
    expect(response.status).toBe(428);
    expect(replaceAllDataMock).not.toHaveBeenCalled();
  });

  test('PUT từ chối phiên bản cũ mà không ghi', async () => {
    const response = await PUT(request('PUT', stored, 'outdated'));
    expect(response.status).toBe(409);
    expect(replaceAllDataMock).not.toHaveBeenCalled();
  });

  test('PUT ghi snapshot hợp lệ và trả phiên bản mới', async () => {
    const next = structuredClone(stored);
    next.departments[0].name = 'Khoa Công nghệ số';
    const response = await PUT(request('PUT', next, createStateVersion(stored)));
    expect(response.status).toBe(200);
    expect(replaceAllDataMock).toHaveBeenCalledWith(next);
    expect(response.headers.get('X-State-Version')).toBe(createStateVersion(next));
    await expect(GET(request('GET')).then((result) => result.json())).resolves.toEqual(next);
  });

  test('PUT chặn phân công cho giáo viên đang tạm nghỉ hoặc nghỉ việc', async () => {
    const next = structuredClone(stored);
    next.teachers[0].status = 'Tạm nghỉ';
    const changedAssignment = next.assignments.find((assignment) => assignment.id === 'ASG-005');
    if (!changedAssignment) throw new Error('Missing fixture');
    changedAssignment.teacherId = 'GV0001';

    const response = await PUT(request('PUT', next, createStateVersion(stored)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('không thể phân công giáo viên')
    });
    expect(replaceAllDataMock).not.toHaveBeenCalled();
  });

  test.each([
    ['sửa lớp', (data: AppData) => { data.classes[0].note = 'Đã sửa'; }, 'Không thể thay đổi hoặc xóa lớp'],
    ['chuyển lớp sang kỳ mở', (data: AppData) => { data.classes[0].semesterId = 'SEM-2025-1'; }, 'Không thể thay đổi hoặc xóa lớp'],
    ['sửa phân công', (data: AppData) => { data.assignments[0].teachingHours = 46; }, 'Không thể thay đổi hoặc xóa phân công'],
    ['xóa phân công', (data: AppData) => { data.assignments = data.assignments.filter((item) => item.id !== 'ASG-001'); }, 'Không thể thay đổi hoặc xóa phân công'],
    ['xóa lớp và phân công lịch sử', (data: AppData) => {
      data.assignments = data.assignments.filter((item) => item.id !== 'ASG-001');
      data.classes = data.classes.filter((item) => item.id !== 'CLS-CSDL-01');
    }, 'Không thể thay đổi hoặc xóa lớp'],
    ['mở khóa và sửa lớp trong cùng một lần lưu', (data: AppData) => {
      data.semesters[0].status = 'Mở';
      data.classes[0].note = 'Đã sửa';
    }, 'Không thể thay đổi hoặc xóa lớp'],
    ['thêm lớp vào kỳ khóa', (data: AppData) => {
      data.classes.push({ ...data.classes[0], id: 'CLS-LOCKED-NEW', code: 'LOCKED.NEW' });
    }, 'Không thể thêm hoặc chuyển lớp']
  ] as Array<[string, (data: AppData) => void, string]>)('PUT chặn thao tác %s ở kỳ khóa dù payload hợp lệ', async (_case, mutate, expectedError) => {
    const next = structuredClone(stored);
    mutate(next);
    const response = await PUT(request('PUT', next, createStateVersion(stored)));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining(expectedError) });
    expect(replaceAllDataMock).not.toHaveBeenCalled();
  });

  test('PUT chặn chuyển phân công từ kỳ mở vào lớp thuộc kỳ khóa', async () => {
    stored.assignments = stored.assignments.filter((item) => item.id !== 'ASG-001');
    const next = structuredClone(stored);
    const openAssignment = next.assignments.find((item) => item.id === 'ASG-005');
    if (!openAssignment) throw new Error('Missing fixture');
    openAssignment.classId = 'CLS-CSDL-01';
    const response = await PUT(request('PUT', next, createStateVersion(stored)));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('Không thể thêm hoặc chuyển phân công')
    });
    expect(replaceAllDataMock).not.toHaveBeenCalled();
  });

  test('mở khóa riêng rồi mới cho sửa lớp ở kỳ đó', async () => {
    const unlocked = structuredClone(stored);
    unlocked.semesters[0].status = 'Mở';
    const unlockResponse = await PUT(request('PUT', unlocked, createStateVersion(stored)));
    expect(unlockResponse.status).toBe(200);

    const edited = structuredClone(stored);
    edited.classes[0].note = 'Sau khi mở khóa';
    const editResponse = await PUT(request('PUT', edited, createStateVersion(stored)));
    expect(editResponse.status).toBe(200);
    expect(replaceAllDataMock).toHaveBeenCalledTimes(2);
  });

  test('quyền reset vẫn khôi phục được toàn bộ dữ liệu mẫu', async () => {
    stored.classes[0].note = 'Giá trị lịch sử cần khôi phục';
    const response = await PUT(request('PUT', initialData, createStateVersion(stored)));
    expect(response.status).toBe(200);
    expect(replaceAllDataMock).toHaveBeenCalledWith(initialData);
  });

  test('hai PUT cùng phiên bản chỉ ghi một lần', async () => {
    const expectedVersion = createStateVersion(stored);
    const first = structuredClone(stored);
    first.departments[0].name = 'Khoa A';
    const second = structuredClone(stored);
    second.departments[0].name = 'Khoa B';
    const responses = await Promise.all([
      PUT(request('PUT', first, expectedVersion)),
      PUT(request('PUT', second, expectedVersion))
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(replaceAllDataMock).toHaveBeenCalledTimes(1);
  });

  test('PUT báo lỗi ghi CSDL và không trả thành công giả', async () => {
    replaceAllDataMock.mockRejectedValue(new Error('disk full'));
    const response = await PUT(request('PUT', stored, createStateVersion(stored)));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });
});
