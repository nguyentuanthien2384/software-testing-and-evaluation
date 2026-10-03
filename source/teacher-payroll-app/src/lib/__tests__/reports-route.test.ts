import { GET } from '../../app/api/reports/route';
import { computePayrollLines } from '../repository';
import { initialData } from '../initial-data';
import { calculateAllPayrollLines } from '../payroll';
import { createSessionToken, SESSION_COOKIE } from '../session';

jest.mock('../repository', () => ({ computePayrollLines: jest.fn() }));

const computeMock = computePayrollLines as jest.MockedFunction<typeof computePayrollLines>;
const cookie = `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken({
  username: 'tester', displayName: 'Kiểm thử viên', role: 'tester'
}))}`;

describe('API báo cáo', () => {
  beforeEach(() => jest.resetAllMocks());

  test('người chưa đăng nhập không thể xem báo cáo', async () => {
    const response = await GET(new Request('http://localhost/api/reports'));
    expect(response.status).toBe(401);
    expect(computeMock).not.toHaveBeenCalled();
  });

  test('lọc theo năm và trả tổng tiền khớp các dòng', async () => {
    const lines = calculateAllPayrollLines(initialData).filter((line) => line.year === '2024-2025');
    computeMock.mockResolvedValue(lines);
    const response = await GET(new Request('http://localhost/api/reports?year=2024-2025', {
      headers: { cookie }
    }));
    expect(response.status).toBe(200);
    expect(computeMock).toHaveBeenCalledWith('2024-2025');
    await expect(response.json()).resolves.toEqual({
      count: lines.length,
      totalAmount: lines.reduce((sum, line) => sum + line.amount, 0),
      lines
    });
  });

  test('không lọc năm khi truy vấn không có year', async () => {
    computeMock.mockResolvedValue([]);
    const response = await GET(new Request('http://localhost/api/reports', { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect(computeMock).toHaveBeenCalledWith(undefined);
  });

  test.each(['', '2024', '2024-2024', '2024-2026', 'all', '2024-2025 OR 1=1'])(
    'year không hợp lệ trả 400 và không đọc bảng lương: %j', async (year) => {
      computeMock.mockResolvedValue([]);
      const response = await GET(new Request(`http://localhost/api/reports?year=${encodeURIComponent(year)}`, {
        headers: { cookie }
      }));
      expect(response.status).toBe(400);
      expect(computeMock).not.toHaveBeenCalled();
    }
  );

  test('trim year trước khi lọc để cùng một năm không bị báo cáo rỗng', async () => {
    computeMock.mockResolvedValue([]);
    const response = await GET(new Request('http://localhost/api/reports?year=%202024-2025%20', { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect(computeMock).toHaveBeenCalledWith('2024-2025');
  });

  test('dữ liệu hỏng được báo lỗi thay vì trả báo cáo thiếu dòng', async () => {
    computeMock.mockRejectedValue(new Error('broken reference'));
    const response = await GET(new Request('http://localhost/api/reports', { headers: { cookie } }));
    expect(response.status).toBe(500);
  });
});
