/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DepartmentsPage from '@/app/departments/page';
import { ReportsPage } from '../ReportsPage';
import { initialData } from '@/lib/initial-data';
import type { AppData } from '@/lib/types';

// Giữ component, useAppData, validation và payroll thật; chỉ thay ranh giới HTTP/quyền.
jest.mock('@/lib/use-auth', () => ({ useAuth: () => ({ can: () => true }) }));

const storageKey = 'n01-g11-teacher-payroll-data-v3';
const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();

function response(body: unknown, status = 200, version: string | null = 'version-1'): Response {
  return {
    ok: status >= 200 && status < 300, status,
    headers: { get: (name: string) => name === 'X-State-Version' ? version : null },
    json: async () => body
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as typeof fetch;
  window.localStorage.clear();
});

afterAll(() => { globalThis.fetch = originalFetch; });

function fillDepartment() {
  fireEvent.change(screen.getByTestId('field-code'), { target: { value: '  QA  ' } });
  fireEvent.change(screen.getByTestId('field-name'), { target: { value: '  Khoa kiểm thử  ' } });
  fireEvent.change(screen.getByTestId('field-createdAt'), { target: { value: '2026-10-03' } });
}

test('luồng thêm khoa giữ form khi HTTP lỗi, chỉ thêm hàng/cache sau khi máy chủ xác nhận retry', async () => {
  let finishPut!: (reply: Response) => void;
  fetchMock
    .mockResolvedValueOnce(response(initialData))
    .mockResolvedValueOnce(response({ error: 'Cơ sở dữ liệu chưa sẵn sàng.' }, 503, null))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishPut = resolve; }));
  render(<DepartmentsPage />);
  await waitFor(() => expect((screen.getByTestId('departments-submit-button') as HTMLButtonElement).disabled).toBe(false));
  fillDepartment();
  fireEvent.submit(screen.getByTestId('departments-form'));
  await waitFor(() => expect(screen.getByTestId('departments-form-message').textContent).toBe('Cơ sở dữ liệu chưa sẵn sàng.'));
  expect((screen.getByTestId('field-name') as HTMLInputElement).value).toBe('  Khoa kiểm thử  ');
  expect(screen.queryByTestId('departments-row-DEP-006')).toBeNull();
  expect(JSON.parse(window.localStorage.getItem(storageKey)!).departments).toHaveLength(5);

  fireEvent.submit(screen.getByTestId('departments-form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect((screen.getByTestId('departments-submit-button') as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByTestId('departments-row-DEP-006')).toBeNull();
  const put = fetchMock.mock.calls[2][1];
  expect(put.method).toBe('PUT');
  expect(put.headers['X-State-Version']).toBe('version-1');
  const persisted = JSON.parse(put.body) as AppData;
  expect(persisted.departments[5]).toMatchObject({ id: 'DEP-006', code: 'QA', name: 'Khoa kiểm thử' });

  await act(async () => { finishPut(response({ ok: true }, 200, 'version-2')); });
  await waitFor(() => expect(screen.getByTestId('departments-row-DEP-006').textContent).toContain('Khoa kiểm thử'));
  expect(JSON.parse(window.localStorage.getItem(storageKey)!).departments).toHaveLength(6);
  expect((screen.getByTestId('field-id') as HTMLInputElement).value).toBe('DEP-007');
});

test('xung đột ghi chặn tiếp tục ghi cho tới khi tải lại lấy dữ liệu/phiên bản mới', async () => {
  const remote: AppData = {
    ...initialData,
    departments: [...initialData.departments, { ...initialData.departments[0], id: 'DEP-006', code: 'KHAC', name: 'Khoa khác' }]
  };
  fetchMock
    .mockResolvedValueOnce(response(initialData))
    .mockResolvedValueOnce(response({ error: 'Có người vừa cập nhật dữ liệu.' }, 409, null))
    .mockResolvedValueOnce(response(remote, 200, 'version-2'))
    .mockResolvedValueOnce(response({ ok: true }, 200, 'version-3'));
  render(<DepartmentsPage />);
  await waitFor(() => expect((screen.getByTestId('departments-submit-button') as HTMLButtonElement).disabled).toBe(false));
  fillDepartment();
  fireEvent.submit(screen.getByTestId('departments-form'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Có người vừa cập nhật dữ liệu.'));
  expect((screen.getByTestId('departments-submit-button') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(screen.getByTestId('departments-form'));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
  await waitFor(() => expect(screen.getByTestId('departments-row-DEP-006').textContent).toContain('Khoa khác'));
  // Form người dùng giữ nguyên để xem/sửa sau xung đột, không âm thầm gửi lại.
  expect((screen.getByTestId('field-name') as HTMLInputElement).value).toBe('  Khoa kiểm thử  ');
  fireEvent.change(screen.getByTestId('field-id'), { target: { value: 'DEP-007' } });
  fireEvent.submit(screen.getByTestId('departments-form'));
  await waitFor(() => expect(screen.getByTestId('departments-row-DEP-007').textContent).toContain('Khoa kiểm thử'));
  expect(fetchMock.mock.calls[3][1].headers['X-State-Version']).toBe('version-2');
  expect(JSON.parse(fetchMock.mock.calls[3][1].body).departments).toHaveLength(7);
});

test('báo cáo thật chỉ xuất hiện sau GET; offline hiển thị cache có cảnh báo và khóa xuất', async () => {
  let finishLoad!: (reply: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { finishLoad = resolve; }));
  const view = render(<ReportsPage />);
  expect(screen.getByRole('status').textContent).toContain('Đang tải dữ liệu');
  expect(screen.queryByTestId('reports-table')).toBeNull();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await act(async () => { finishLoad(response(initialData)); });
  expect(screen.getByTestId('reports-table').querySelectorAll('tbody tr')).toHaveLength(6);
  expect((screen.getByTestId('reports-export-csv-button') as HTMLButtonElement).disabled).toBe(false);
  view.unmount();

  fetchMock.mockRejectedValueOnce(new Error('Mất mạng'));
  render(<ReportsPage />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('bản sao gần nhất'));
  expect(screen.getByTestId('reports-table').querySelectorAll('tbody tr')).toHaveLength(6);
  expect((screen.getByTestId('reports-export-csv-button') as HTMLButtonElement).disabled).toBe(true);
});

test('lần mở đầu mất mạng và chưa có cache không hiển thị số liệu demo thành báo cáo', async () => {
  fetchMock.mockRejectedValueOnce(new Error('Mất mạng'));
  render(<ReportsPage />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không có bản sao dữ liệu hợp lệ'));
  expect(screen.getByTestId('reports-table').textContent).toContain('Không có dữ liệu báo cáo');
  expect(screen.getByTestId('reports-table').textContent).not.toContain('Nguyễn Văn An');
  expect((screen.getByTestId('reports-export-csv-button') as HTMLButtonElement).disabled).toBe(true);
  expect(window.localStorage.getItem(storageKey)).toBeNull();
});
