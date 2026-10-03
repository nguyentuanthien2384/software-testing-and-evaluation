/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EntityCrudPage, FieldConfig } from '../EntityCrudPage';
import { initialData } from '@/lib/initial-data';
import { AppData } from '@/lib/types';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

jest.mock('@/lib/use-app-data', () => ({ useAppData: jest.fn() }));
jest.mock('@/lib/use-auth', () => ({ useAuth: jest.fn() }));

const mockedUseAppData = jest.mocked(useAppData);
const mockedUseAuth = jest.mocked(useAuth);
const addItem = jest.fn().mockResolvedValue({ ok: true });
const addItems = jest.fn().mockResolvedValue({ ok: true });
const updateItem = jest.fn().mockResolvedValue({ ok: true });
const removeItem = jest.fn().mockResolvedValue({ ok: true });
const reloadData = jest.fn();

const teacherFields: FieldConfig[] = [
  { name: 'id', label: 'Mã GV', type: 'text', required: true },
  { name: 'fullName', label: 'Họ và tên', type: 'text', required: true },
  { name: 'dateOfBirth', label: 'Ngày sinh', type: 'date', required: true },
  { name: 'phone', label: 'Số điện thoại', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'departmentId', label: 'Khoa', type: 'select', required: true, optionsSource: 'departments', optionLabelFields: ['code', 'name'] },
  { name: 'degreeId', label: 'Bằng cấp', type: 'select', required: true, optionsSource: 'degrees', optionLabelFields: ['shortName', 'name'] },
  { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: [
    { value: 'Đang giảng dạy', label: 'Đang giảng dạy' },
    { value: 'Tạm nghỉ', label: 'Tạm nghỉ' }
  ] }
];

const classFields: FieldConfig[] = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'code', label: 'Mã lớp', type: 'text', required: true },
  { name: 'subjectId', label: 'Học phần', type: 'select', required: true, optionsSource: 'subjects', optionLabelFields: ['code', 'name'] },
  { name: 'semesterId', label: 'Kỳ học', type: 'select', required: true, optionsSource: 'semesters', optionLabelFields: ['name', 'year'] },
  { name: 'studentCount', label: 'Sĩ số', type: 'number', required: true, min: '1', step: '1' },
  { name: 'note', label: 'Ghi chú', type: 'textarea' }
];

const coefficientFields: FieldConfig[] = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'year', label: 'Năm học', type: 'text', required: true },
  { name: 'degreeId', label: 'Bằng cấp', type: 'select', required: true, optionsSource: 'degrees', optionLabelFields: ['shortName'] },
  { name: 'coefficient', label: 'Hệ số', type: 'number', required: true, min: '0.01', step: '0.01' }
];

function mockData(data: AppData = initialData, overrides: Partial<ReturnType<typeof useAppData>> = {}) {
  mockedUseAppData.mockReturnValue({
    data, loaded: true, saving: false, loadError: '', reloadData,
    addItem, addItems, updateItem, removeItem, resetData: jest.fn(), ...overrides
  } as ReturnType<typeof useAppData>);
}

function renderTeachers() {
  return render(<EntityCrudPage entityKey="teachers" title="Quản lý Giáo viên" description="" fields={teacherFields} idPrefix="GV" />);
}

function renderClasses() {
  return render(<EntityCrudPage entityKey="classes" title="Quản lý Lớp học phần" description="" fields={classFields} idPrefix="CLS" allowBulkCreate />);
}

function renderCoefficients() {
  return render(<EntityCrudPage entityKey="degreeCoefficients" title="Hệ số giáo viên" description="" fields={coefficientFields} idPrefix="DCOEF" allowCopyPreviousYear />);
}

beforeEach(() => {
  jest.clearAllMocks();
  addItem.mockResolvedValue({ ok: true });
  addItems.mockResolvedValue({ ok: true });
  updateItem.mockResolvedValue({ ok: true });
  removeItem.mockResolvedValue({ ok: true });
  mockedUseAuth.mockReturnValue({ can: jest.fn(() => true) } as unknown as ReturnType<typeof useAuth>);
  mockData();
});

test.each([
  { loaded: false, saving: false, loadError: '' },
  { loaded: true, saving: true, loadError: '' },
  { loaded: true, saving: false, loadError: 'Mất mạng. Chỉ đọc.' }
])('khóa thêm/sửa/xóa khi dữ liệu chưa sẵn sàng hoặc đang lưu: %p', (status) => {
  mockData(initialData, status);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  renderTeachers();
  const edit = screen.getByTestId('teachers-edit-GV0008') as HTMLButtonElement;
  const remove = screen.getByTestId('teachers-delete-GV0008') as HTMLButtonElement;
  expect(edit.disabled).toBe(true);
  expect(remove.disabled).toBe(true);
  expect((screen.getByTestId('teachers-new-button') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(remove);
  expect(confirm).not.toHaveBeenCalled();
  expect(removeItem).not.toHaveBeenCalled();
  confirm.mockRestore();
});

test('bấm xóa nhiều lần khi API chưa trả về chỉ gửi một lần', async () => {
  mockData({ ...initialData, assignments: initialData.assignments.filter((assignment) => assignment.teacherId !== 'GV0008') });
  let finishSave!: (result: { ok: true }) => void;
  removeItem.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  renderTeachers();
  fireEvent.click(screen.getByTestId('teachers-delete-GV0008'));
  fireEvent.click(screen.getByTestId('teachers-delete-GV0008'));
  expect(removeItem).toHaveBeenCalledTimes(1);
  await act(async () => { finishSave({ ok: true }); });
  confirm.mockRestore();
});

test('tạo giáo viên bằng mã tiếp theo và lưu các giá trị đã chuẩn hóa', async () => {
  renderTeachers();
  expect((screen.getByTestId('field-id') as HTMLInputElement).value).toBe('GV0009');

  fireEvent.change(screen.getByTestId('field-fullName'), { target: { value: '  Nguyễn Thị Mới  ' } });
  fireEvent.change(screen.getByTestId('field-dateOfBirth'), { target: { value: '1990-03-10' } });
  fireEvent.change(screen.getByTestId('field-phone'), { target: { value: '0912345678' } });
  fireEvent.change(screen.getByTestId('field-email'), { target: { value: '  moi@example.com  ' } });
  fireEvent.change(screen.getByTestId('field-departmentId'), { target: { value: 'DEP-CNTT' } });
  fireEvent.change(screen.getByTestId('field-degreeId'), { target: { value: 'DEG-TS' } });
  fireEvent.submit(screen.getByTestId('teachers-form'));

  await waitFor(() => expect(addItem).toHaveBeenCalledWith('teachers', expect.objectContaining({
    id: 'GV0009', fullName: 'Nguyễn Thị Mới', email: 'moi@example.com', departmentId: 'DEP-CNTT', degreeId: 'DEG-TS'
  })));
  await waitFor(() => expect(screen.getByTestId('teachers-form-message').textContent).toContain('Thêm dữ liệu thành công'));
});

test('sửa giữ nguyên mã; chặn xoá giáo viên đã có phân công', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  renderTeachers();
  fireEvent.click(screen.getByTestId('teachers-edit-GV0001'));
  expect((screen.getByTestId('field-id') as HTMLInputElement).disabled).toBe(true);
  fireEvent.change(screen.getByTestId('field-fullName'), { target: { value: 'Tên đã sửa' } });
  fireEvent.submit(screen.getByTestId('teachers-form'));
  await waitFor(() => expect(updateItem).toHaveBeenCalledWith('teachers', 'GV0001', expect.objectContaining({ id: 'GV0001', fullName: 'Tên đã sửa' })));

  fireEvent.click(screen.getByTestId('teachers-delete-GV0001'));
  expect(screen.getByTestId('teachers-form-message').textContent).toContain('đã có phân công');
  expect(confirm).not.toHaveBeenCalled();
  expect(removeItem).not.toHaveBeenCalled();
  confirm.mockRestore();
});

test('tài khoản chỉ xem vẫn tìm kiếm được nhưng không thấy thao tác thay đổi', () => {
  mockedUseAuth.mockReturnValue({ can: jest.fn(() => false) } as unknown as ReturnType<typeof useAuth>);
  renderTeachers();
  expect(screen.getByTestId('teachers-readonly-notice')).not.toBeNull();
  expect(screen.queryByTestId('teachers-form')).toBeNull();
  expect(screen.queryByTestId('teachers-edit-GV0001')).toBeNull();

  fireEvent.change(screen.getByTestId('teachers-search-input'), { target: { value: 'Nguyễn Văn An' } });
  expect(screen.getByTestId('teachers-row-GV0001')).not.toBeNull();
  expect(screen.queryByTestId('teachers-row-GV0002')).toBeNull();
});

test('tạo lô lớp liên tiếp và từ chối lớp trong kỳ học đã khóa', async () => {
  renderClasses();
  fireEvent.change(screen.getByTestId('field-code'), { target: { value: 'CSDL101.07' } });
  fireEvent.change(screen.getByTestId('field-subjectId'), { target: { value: 'SUB-CSDL' } });
  fireEvent.change(screen.getByTestId('field-semesterId'), { target: { value: 'SEM-2024-1' } });
  fireEvent.change(screen.getByTestId('field-studentCount'), { target: { value: '30' } });
  fireEvent.change(screen.getByTestId('classes-batch-count'), { target: { value: '2' } });
  fireEvent.submit(screen.getByTestId('classes-form'));
  expect(screen.getByTestId('classes-form-message').textContent).toContain('đã khóa');
  expect(addItems).not.toHaveBeenCalled();

  fireEvent.change(screen.getByTestId('field-semesterId'), { target: { value: 'SEM-2025-1' } });
  fireEvent.submit(screen.getByTestId('classes-form'));
  await waitFor(() => expect(addItems).toHaveBeenCalledWith('classes', [
    expect.objectContaining({ id: 'CLS-007', code: 'CSDL101.07', studentCount: 30 }),
    expect.objectContaining({ id: 'CLS-008', code: 'CSDL101.08', studentCount: 30 })
  ]));
});

test('giữ bản nháp đang nhập khi danh sách được tải lại', () => {
  const { rerender } = renderTeachers();
  fireEvent.change(screen.getByTestId('field-fullName'), { target: { value: 'Bản nháp chưa lưu' } });
  mockData({ ...initialData, teachers: [...initialData.teachers] });
  rerender(<EntityCrudPage entityKey="teachers" title="Quản lý Giáo viên" description="" fields={teacherFields} idPrefix="GV" />);
  expect((screen.getByTestId('field-fullName') as HTMLInputElement).value).toBe('Bản nháp chưa lưu');
});

test('lỗi khi lưu giữ lại biểu mẫu để người dùng sửa và thử lại', async () => {
  addItem.mockResolvedValueOnce({ ok: false, error: 'Máy chủ từ chối lưu.' }).mockResolvedValueOnce({ ok: true });
  renderTeachers();
  fireEvent.change(screen.getByTestId('field-fullName'), { target: { value: 'Nguyễn Thị Mới' } });
  fireEvent.change(screen.getByTestId('field-dateOfBirth'), { target: { value: '1990-03-10' } });
  fireEvent.change(screen.getByTestId('field-phone'), { target: { value: '0912345678' } });
  fireEvent.change(screen.getByTestId('field-email'), { target: { value: 'moi@example.com' } });
  fireEvent.change(screen.getByTestId('field-departmentId'), { target: { value: 'DEP-CNTT' } });
  fireEvent.change(screen.getByTestId('field-degreeId'), { target: { value: 'DEG-TS' } });
  fireEvent.submit(screen.getByTestId('teachers-form'));
  await waitFor(() => expect(screen.getByTestId('teachers-form-message').textContent).toBe('Máy chủ từ chối lưu.'));
  expect((screen.getByTestId('field-fullName') as HTMLInputElement).value).toBe('Nguyễn Thị Mới');
  fireEvent.submit(screen.getByTestId('teachers-form'));
  await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
});

test('bấm gửi nhiều lần trong lúc lưu chỉ tạo một bản ghi', async () => {
  let finishSave: ((result: { ok: true }) => void) | undefined;
  addItem.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
  renderTeachers();
  fireEvent.change(screen.getByTestId('field-fullName'), { target: { value: 'Nguyễn Thị Mới' } });
  fireEvent.change(screen.getByTestId('field-dateOfBirth'), { target: { value: '1990-03-10' } });
  fireEvent.change(screen.getByTestId('field-phone'), { target: { value: '0912345678' } });
  fireEvent.change(screen.getByTestId('field-email'), { target: { value: 'moi@example.com' } });
  fireEvent.change(screen.getByTestId('field-departmentId'), { target: { value: 'DEP-CNTT' } });
  fireEvent.change(screen.getByTestId('field-degreeId'), { target: { value: 'DEG-TS' } });
  fireEvent.submit(screen.getByTestId('teachers-form'));
  fireEvent.submit(screen.getByTestId('teachers-form'));
  expect(addItem).toHaveBeenCalledTimes(1);
  await act(async () => { finishSave?.({ ok: true }); });
});

test('sao chép hệ số năm trước sang năm kế tiếp và báo lỗi nếu năm đích đã có dữ liệu', async () => {
  renderCoefficients();
  expect((screen.getByTestId('degree-coefficients-copy-source') as HTMLSelectElement).value).toBe('2025-2026');
  expect((screen.getByTestId('degree-coefficients-copy-target') as HTMLInputElement).value).toBe('2026-2027');
  fireEvent.click(screen.getByTestId('degree-coefficients-copy-button'));
  await waitFor(() => expect(addItems).toHaveBeenCalledWith('degreeCoefficients', expect.arrayContaining([
    expect.objectContaining({ year: '2026-2027', degreeId: 'DEG-TS', coefficient: 2.1 })
  ])));
  expect(addItems.mock.calls[0][1]).toHaveLength(4);

  fireEvent.change(screen.getByTestId('degree-coefficients-copy-target'), { target: { value: '2025-2026' } });
  fireEvent.click(screen.getByTestId('degree-coefficients-copy-button'));
  expect(screen.getByTestId('degreeCoefficients-form-message').textContent).toContain('năm học liền sau');
  expect(addItems).toHaveBeenCalledTimes(1);
});
