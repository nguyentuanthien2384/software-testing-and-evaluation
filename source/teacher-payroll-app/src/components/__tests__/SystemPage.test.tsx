/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SystemPage } from '../SystemPage';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';
import { createBackup } from '@/lib/backup';
import { initialData } from '@/lib/initial-data';

jest.mock('@/lib/use-app-data', () => ({ useAppData: jest.fn() }));
jest.mock('@/lib/use-auth', () => ({ useAuth: jest.fn() }));

const mockedUseAppData = jest.mocked(useAppData);
const mockedUseAuth = jest.mocked(useAuth);
const resetData = jest.fn().mockResolvedValue({ ok: true });
const restoreData = jest.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  jest.clearAllMocks();
  resetData.mockResolvedValue({ ok: true });
  restoreData.mockResolvedValue({ ok: true });
  mockedUseAppData.mockReturnValue({ data: initialData, resetData, restoreData, saving: false } as unknown as ReturnType<typeof useAppData>);
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
  mockedUseAppData.mockReturnValue({ data: initialData, resetData, restoreData, saving: true } as unknown as ReturnType<typeof useAppData>);
  view.rerender(<SystemPage />);
  expect((screen.getByTestId('system-reset-button') as HTMLButtonElement).disabled).toBe(true);
  confirm.mockRestore();
});

test('xuất backup JSON có định dạng hệ thống', () => {
  const createObjectURL = jest.fn(() => 'blob:test');
  const revokeObjectURL = jest.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  render(<SystemPage />);
  fireEvent.click(screen.getByTestId('system-export-button'));

  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Đã xuất file backup');
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  click.mockRestore();
});

test('khôi phục backup hợp lệ qua input file', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  const file = {
    size: 100,
    text: jest.fn().mockResolvedValue(createBackup(initialData, '2026-09-24T10:00:00.000Z'))
  } as unknown as File;
  render(<SystemPage />);

  fireEvent.change(screen.getByTestId('system-import-input'), { target: { files: [file] } });

  await waitFor(() => expect(restoreData).toHaveBeenCalledWith(initialData));
  expect(screen.getByRole('status').textContent).toContain('Đã khôi phục dữ liệu từ file backup');
  confirm.mockRestore();
});

test('từ chối backup hỏng và không gọi API khôi phục', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  const file = { size: 100, text: jest.fn().mockResolvedValue('{') } as unknown as File;
  render(<SystemPage />);

  fireEvent.change(screen.getByTestId('system-import-input'), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Backup không hợp lệ'));
  expect(restoreData).not.toHaveBeenCalled();
  confirm.mockRestore();
});

test('chặn file backup quá lớn trước khi đọc', async () => {
  const file = { size: 5 * 1024 * 1024 + 1, text: jest.fn() } as unknown as File;
  render(<SystemPage />);

  fireEvent.change(screen.getByTestId('system-import-input'), { target: { files: [file] } });

  expect(screen.getByRole('status').textContent).toContain('vượt quá giới hạn 5 MB');
  expect(file.text).not.toHaveBeenCalled();
  expect(restoreData).not.toHaveBeenCalled();
});

test('hủy xác nhận khôi phục thì không đọc file và không gọi API', () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  const file = { size: 100, text: jest.fn() } as unknown as File;
  render(<SystemPage />);

  fireEvent.change(screen.getByTestId('system-import-input'), { target: { files: [file] } });

  expect(file.text).not.toHaveBeenCalled();
  expect(restoreData).not.toHaveBeenCalled();
  confirm.mockRestore();
});
