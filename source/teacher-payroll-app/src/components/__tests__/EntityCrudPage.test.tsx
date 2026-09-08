/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EntityCrudPage, FieldConfig } from '../EntityCrudPage';
import { AppData } from '@/lib/types';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

jest.mock('@/lib/use-app-data', () => ({ useAppData: jest.fn() }));
jest.mock('@/lib/use-auth', () => ({ useAuth: jest.fn() }));

const EMPTY_DATA: AppData = {
  degrees: [],
  departments: [],
  teachers: [],
  subjects: [],
  semesters: [],
  classes: [],
  assignments: [],
  paymentRates: [],
  degreeCoefficients: [],
  classCoefficients: []
};

const SUBJECT_FIELDS: FieldConfig[] = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'code', label: 'Mã học phần', type: 'text', required: true },
  { name: 'name', label: 'Tên học phần', type: 'text', required: true },
  { name: 'credits', label: 'Số tín chỉ', type: 'number', required: true, min: '1', step: '1' },
  { name: 'totalHours', label: 'Số tiết', type: 'number', required: true, min: '1', step: '1' },
  { name: 'coefficient', label: 'Hệ số học phần', type: 'number', required: true, min: '0.1', step: '0.1' }
];

const CLASS_FIELDS: FieldConfig[] = [
  { name: 'id', label: 'Mã', type: 'text', required: true },
  { name: 'studentCount', label: 'Sĩ số', type: 'number', required: true, min: '1', step: '1' }
];

const mockedUseAppData = jest.mocked(useAppData);
const mockedUseAuth = jest.mocked(useAuth);
const addItem = jest.fn().mockResolvedValue({ ok: true });

function renderSubjects() {
  return render(
    <EntityCrudPage
      entityKey="subjects"
      title="Quản lý Học phần"
      description="Kiểm thử nhập số"
      fields={SUBJECT_FIELDS}
      idPrefix="SUB"
    />
  );
}

function renderClasses() {
  return render(
    <EntityCrudPage
      entityKey="classes"
      title="Quản lý Lớp học phần"
      description="Kiểm thử tạo nhiều lớp"
      fields={CLASS_FIELDS}
      idPrefix="CLS"
      allowBulkCreate
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: null,
    ready: true,
    login: jest.fn(),
    logout: jest.fn(),
    can: jest.fn(() => true)
  });
  mockedUseAppData.mockReturnValue({
    data: EMPTY_DATA,
    loaded: true,
    saving: false,
    loadError: '',
    reloadData: jest.fn(),
    addItem,
    addItems: jest.fn().mockResolvedValue({ ok: true }),
    updateItem: jest.fn().mockResolvedValue({ ok: true }),
    removeItem: jest.fn().mockResolvedValue({ ok: true }),
    resetData: jest.fn().mockResolvedValue({ ok: true })
  } as unknown as ReturnType<typeof useAppData>);
});

describe('EntityCrudPage - trường số dương', () => {
  test('khai báo đúng ràng buộc truy cập và bước 0.1 trên trường hệ số', () => {
    renderSubjects();

    const coefficient = screen.getByTestId('field-coefficient') as HTMLInputElement;
    expect(coefficient.type).toBe('text');
    expect(coefficient.inputMode).toBe('decimal');
    expect(coefficient.getAttribute('data-numeric-input')).toBe('true');
    expect(coefficient.getAttribute('aria-required')).toBe('true');
    expect(coefficient.required).toBe(true);
    expect(coefficient.min).toBe('0.1');
    expect(coefficient.step).toBe('0.1');
    expect(coefficient.pattern).toBe('[0-9]*([.,][0-9]*)?');
  });

  test('chặn số âm được dán và chỉ nhận lại dữ liệu sau khi blur', () => {
    renderSubjects();
    const coefficient = screen.getByTestId('field-coefficient') as HTMLInputElement;

    fireEvent.input(coefficient, { target: { value: '-1.2' }, inputType: 'insertFromPaste' });
    expect(coefficient.value).toBe('');

    // Trường vẫn bị khóa để phần còn lại của chuỗi dán không lọt vào.
    fireEvent.input(coefficient, { target: { value: '1.2' }, inputType: 'insertFromPaste' });
    expect(coefficient.value).toBe('');

    fireEvent.blur(coefficient);
    fireEvent.change(coefficient, { target: { value: '1.2' } });
    expect(coefficient.value).toBe('1.2');
  });

  test('chặn phím trừ, giữ khóa và mở khóa bằng Backspace', () => {
    renderSubjects();
    const coefficient = screen.getByTestId('field-coefficient') as HTMLInputElement;
    fireEvent.change(coefficient, { target: { value: '1.1' } });

    expect(fireEvent.keyDown(coefficient, { key: '-' })).toBe(false);
    expect(coefficient.value).toBe('');

    fireEvent.change(coefficient, { target: { value: '2.1' } });
    expect(coefficient.value).toBe('');

    fireEvent.keyDown(coefficient, { key: 'Backspace' });
    fireEvent.change(coefficient, { target: { value: '2.1' } });
    expect(coefficient.value).toBe('2.1');
  });

  test('chặn dấu cộng mà không xóa giá trị dương đang có', () => {
    renderSubjects();
    const coefficient = screen.getByTestId('field-coefficient') as HTMLInputElement;
    fireEvent.change(coefficient, { target: { value: '1.1' } });

    expect(fireEvent.keyDown(coefficient, { key: '+' })).toBe(false);
    expect(coefficient.value).toBe('1.1');
  });

  test('từ chối hệ số lệch bước 0.1 và chấp nhận hệ số đúng bước', async () => {
    renderSubjects();

    fireEvent.change(screen.getByTestId('field-code'), { target: { value: 'TEST101' } });
    fireEvent.change(screen.getByTestId('field-name'), { target: { value: 'Học phần kiểm thử' } });
    fireEvent.change(screen.getByTestId('field-credits'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('field-totalHours'), { target: { value: '45' } });
    fireEvent.change(screen.getByTestId('field-coefficient'), { target: { value: '1.15' } });
    fireEvent.submit(screen.getByTestId('subjects-form'));

    expect(screen.getByTestId('subjects-form-message').textContent).toContain('Hệ số học phần phải theo bước 0.1.');
    expect(addItem).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('field-coefficient'), { target: { value: '1.2' } });
    fireEvent.submit(screen.getByTestId('subjects-form'));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem).toHaveBeenCalledWith('subjects', expect.objectContaining({ coefficient: 1.2 }));
  });
});

describe('EntityCrudPage - số lượng tạo lớp hàng loạt', () => {
  test('chặn số lượng âm, giữ khóa và reset bằng blur', () => {
    renderClasses();
    const batchCount = screen.getByTestId('classes-batch-count') as HTMLInputElement;

    expect(batchCount.type).toBe('text');
    expect(batchCount.inputMode).toBe('numeric');
    expect(batchCount.required).toBe(true);
    expect(batchCount.min).toBe('1');
    expect(batchCount.max).toBe('50');
    expect(batchCount.step).toBe('1');
    expect(batchCount.pattern).toBe('[0-9]*');

    fireEvent.input(batchCount, { target: { value: '-5' }, inputType: 'insertFromPaste' });
    expect(batchCount.value).toBe('');

    fireEvent.change(batchCount, { target: { value: '5' } });
    expect(batchCount.value).toBe('');

    fireEvent.blur(batchCount);
    fireEvent.change(batchCount, { target: { value: '5' } });
    expect(batchCount.value).toBe('5');
  });

  test('chặn phím trừ và cho phép nhập lại sau Backspace', () => {
    renderClasses();
    const batchCount = screen.getByTestId('classes-batch-count') as HTMLInputElement;

    expect(fireEvent.keyDown(batchCount, { key: '-' })).toBe(false);
    expect(batchCount.value).toBe('');

    fireEvent.change(batchCount, { target: { value: '3' } });
    expect(batchCount.value).toBe('');

    fireEvent.keyDown(batchCount, { key: 'Backspace' });
    fireEvent.change(batchCount, { target: { value: '3' } });
    expect(batchCount.value).toBe('3');
  });
});
