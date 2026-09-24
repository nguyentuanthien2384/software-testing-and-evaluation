import { GET } from '../../app/api/teachers/route';
import { getAllData } from '../repository';
import { initialData } from '../initial-data';
import { createSessionToken, SESSION_COOKIE } from '../session';
import type { AppData } from '../types';

jest.mock('../repository', () => ({ getAllData: jest.fn() }));

const getAllDataMock = getAllData as jest.MockedFunction<typeof getAllData>;
const cookie = `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken({
  username: 'tester', displayName: 'Kiểm thử viên', role: 'tester'
}))}`;

describe('API giáo viên', () => {
  beforeEach(() => jest.resetAllMocks());

  test('không cho đọc khi chưa đăng nhập', async () => {
    const response = await GET(new Request('http://localhost/api/teachers'));
    expect(response.status).toBe(401);
    expect(getAllDataMock).not.toHaveBeenCalled();
  });

  test('trả danh sách rỗng khi giáo viên đã bị xóa nhưng dữ liệu khác vẫn còn', async () => {
    getAllDataMock.mockResolvedValue({ ...structuredClone(initialData), teachers: [] });
    const response = await GET(new Request('http://localhost/api/teachers', { headers: { cookie } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  test('chỉ trả giáo viên mẫu khi toàn bộ CSDL trống', async () => {
    getAllDataMock.mockResolvedValue(Object.fromEntries(
      Object.keys(initialData).map((key) => [key, []])
    ) as unknown as AppData);
    const response = await GET(new Request('http://localhost/api/teachers', { headers: { cookie } }));
    await expect(response.json()).resolves.toEqual(initialData.teachers);
  });

  test('lỗi CSDL được báo 503', async () => {
    getAllDataMock.mockRejectedValue(new Error('database offline'));
    const response = await GET(new Request('http://localhost/api/teachers', { headers: { cookie } }));
    expect(response.status).toBe(503);
  });
});
