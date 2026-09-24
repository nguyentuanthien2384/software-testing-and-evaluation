/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SystemPage } from '../SystemPage';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

jest.mock('@/lib/use-app-data', () => ({ useAppData: jest.fn() }));
jest.mock('@/lib/use-auth', () => ({ useAuth: jest.fn() }));

const mockedUseAppData = jest.mocked(useAppData);
const mockedUseAuth = jest.mocked(useAuth);
const resetData = jest.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  jest.clearAllMocks();
  resetData.mockResolvedValue({ ok: true });
  mockedUseAppData.mockReturnValue({ resetData, saving: false } as unknown as ReturnType<typeof useAppData>);
  mockedUseAuth.mockReturnValue({ can: jest.fn(() => true) } as unknown as ReturnType<typeof useAuth>);
});

test('chỉ quản trị viên được thấy nút reset', () => {
  mockedUseAuth.mockReturnValue({ can: jest.fn(() => false) } as unknown as ReturnType<typeof useAuth>);
  render(<SystemPage />);
  expect(screen.getByTestId('system-reset-denied').textContent).toContain('Chỉ tài khoản quản trị viên');
  expect(screen.queryByTestId('system-reset-button')).toBeNull();
});

test('huỷ hộp xác nhận không reset, xác nhận mới reset và hiện kết quả', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<SystemPage />);
  fireEvent.click(screen.getByTestId('system-reset-button'));
  expect(resetData).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('system-reset-button'));
  await waitFor(() => expect(resetData).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Đã khôi phục dữ liệu mẫu'));
  confirm.mockRestore();
});

test('khi reset thất bại hiển thị lỗi; trong lúc đang lưu nút bị khóa', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  resetData.mockResolvedValueOnce({ ok: false, error: 'Không thể ghi dữ liệu.' });
  const view = render(<SystemPage />);
  fireEvent.click(screen.getByTestId('system-reset-button'));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Không thể ghi dữ liệu.'));
  mockedUseAppData.mockReturnValue({ resetData, saving: true } as unknown as ReturnType<typeof useAppData>);
  view.rerender(<SystemPage />);
  expect((screen.getByTestId('system-reset-button') as HTMLButtonElement).disabled).toBe(true);
  confirm.mockRestore();
});
