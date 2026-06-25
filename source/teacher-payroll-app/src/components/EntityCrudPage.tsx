'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { AppData, EntityKey } from '@/lib/types';
import { generateNextTeacherCode, validateTeacher } from '@/lib/payroll';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea';

type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
  options?: { value: string; label: string }[];
  optionsSource?: EntityKey;
  optionLabelFields?: string[];
  placeholder?: string;
  tableOnly?: boolean;
};

type EntityCrudPageProps = {
  entityKey: EntityKey;
  title: string;
  description: string;
  fields: FieldConfig[];
  idPrefix: string;
  searchPlaceholder?: string;
};

type Row = Record<string, string | number> & { id: string };

export function EntityCrudPage({ entityKey, title, description, fields, idPrefix, searchPlaceholder }: EntityCrudPageProps) {
  const { data, addItem, updateItem, removeItem } = useAppData();
  const { can } = useAuth();
  const canManage = can('data:manage');
  const rows = data[entityKey] as unknown as Row[];
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Row>(() => buildEmptyRow(fields, entityKey, rows, idPrefix));
  const [message, setMessage] = useState<string>('');

  const visibleFields = fields.filter((field) => !field.tableOnly);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [query, rows]);

  function startCreate(options?: { keepMessage?: boolean }) {
    setEditingId(null);
    setForm(buildEmptyRow(fields, entityKey, rows, idPrefix));
    if (!options?.keepMessage) setMessage('');
  }

  function startEdit(row: Row) {
    setEditingId(row.id);
    setForm({ ...row });
    setMessage('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      setMessage('Bạn không có quyền thay đổi dữ liệu (chỉ tài khoản quản trị viên).');
      return;
    }
    const errors = validateRow(entityKey, form, visibleFields, data);
    if (errors.length > 0) {
      setMessage(errors.join(' '));
      return;
    }

    if (editingId) {
      updateItem(entityKey, editingId, normalizeRow(form, visibleFields));
      setMessage('Cập nhật dữ liệu thành công.');
    } else {
      addItem(entityKey, normalizeRow(form, visibleFields));
      setMessage('Thêm dữ liệu thành công.');
    }
    startCreate({ keepMessage: true });
  }

  function handleDelete(row: Row) {
    if (!canManage) {
      setMessage('Bạn không có quyền xoá dữ liệu (chỉ tài khoản quản trị viên).');
      return;
    }
    const guard = canDelete(entityKey, row.id, data);
    if (!guard.ok) {
      setMessage(guard.message);
      return;
    }
    if (window.confirm('Bạn có chắc muốn xoá bản ghi này?')) {
      removeItem(entityKey, row.id);
      setMessage('Đã xoá dữ liệu.');
      if (editingId === row.id) startCreate();
    }
  }

  return (
    <main className="page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">Quản trị dữ liệu</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <section className={canManage ? 'crud-layout' : 'crud-layout readonly'}>
        {canManage ? (
          <div className="panel">
            <div className="panel-title-row">
              <h2>{editingId ? 'Chỉnh sửa' : 'Thêm mới'}</h2>
              <button className="ghost-btn" data-testid={`${entityKey}-new-button`} type="button" onClick={() => startCreate()}>Tạo mới</button>
            </div>
            <form className="form-grid" data-testid={`${entityKey}-form`} onSubmit={handleSubmit}>
              {visibleFields.map((field) => (
                <label className={field.type === 'textarea' ? 'full' : ''} key={field.name}>
                  {field.label}
                  {renderField(field, form, setForm, data)}
                </label>
              ))}
              <button className="primary-btn full" data-testid={`${entityKey}-submit-button`} type="submit">{editingId ? 'Cập nhật' : 'Thêm'}</button>
            </form>
            {message && <p data-testid={`${entityKey}-form-message`} className={message.includes('thành công') || message.includes('Đã') ? 'success-message' : 'error-message'}>{message}</p>}
          </div>
        ) : (
          <div className="panel" data-testid={`${entityKey}-readonly-notice`}>
            <h2>Chế độ chỉ xem</h2>
            <p className="muted">Tài khoản kiểm thử viên chỉ được xem dữ liệu. Mọi thao tác thêm, sửa, xoá đều do quản trị viên thực hiện.</p>
          </div>
        )}

        <div className="panel table-panel">
          <div className="toolbar">
            <input data-testid={`${entityKey}-search-input`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder ?? 'Tìm kiếm...'} />
            <span>{filteredRows.length}/{rows.length} bản ghi</span>
          </div>
          <div className="table-wrapper">
            <table data-testid={`${entityKey}-table`}>
              <thead>
                <tr>
                  {fields.map((field) => <th key={field.name}>{field.label}</th>)}
                  {canManage && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr><td colSpan={fields.length + (canManage ? 1 : 0)}>Không có dữ liệu phù hợp.</td></tr>
                )}
                {filteredRows.map((row) => (
                  <tr data-testid={`${entityKey}-row-${row.id}`} key={row.id}>
                    {fields.map((field) => <td key={field.name}>{displayValue(field, row[field.name], data)}</td>)}
                    {canManage && (
                      <td className="actions">
                        <button type="button" data-testid={`${entityKey}-edit-${row.id}`} onClick={() => startEdit(row)}>Sửa</button>
                        <button className="danger" data-testid={`${entityKey}-delete-${row.id}`} type="button" onClick={() => handleDelete(row)}>Xoá</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function renderField(field: FieldConfig, form: Row, setForm: (row: Row) => void, data: AppData) {
  const value = form[field.name] ?? '';
  const common = {
    name: field.name,
    'data-testid': `field-${field.name}`,
    required: field.required,
    value: String(value),
    placeholder: field.placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const raw = event.target.value;
      setForm({ ...form, [field.name]: field.type === 'number' ? Number(raw) : raw });
    }
  };

  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">-- Chọn --</option>
        {getOptions(field, data).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return <textarea {...common} rows={3} />;
  }

  return <input {...common} type={field.type} step={field.step} min={field.min} max={field.max} />;
}

function getOptions(field: FieldConfig, data: AppData): { value: string; label: string }[] {
  if (field.options) return field.options;
  if (!field.optionsSource) return [];
  const rows = data[field.optionsSource] as unknown as Row[];
  return rows.map((row) => ({
    value: row.id,
    label: (field.optionLabelFields ?? ['name']).map((key) => row[key]).filter(Boolean).join(' - ')
  }));
}

function displayValue(field: FieldConfig, value: string | number, data: AppData): string | number {
  if (field.type === 'select') {
    const option = getOptions(field, data).find((item) => item.value === value);
    return option?.label ?? value;
  }
  if (field.type === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('vi-VN').format(value);
  }
  return value ?? '';
}

function buildEmptyRow(fields: FieldConfig[], entityKey: EntityKey, rows: Row[], prefix: string): Row {
  const row: Row = { id: createId(entityKey, rows, prefix) };
  for (const field of fields) {
    if (field.name === 'id') continue;
    if (field.type === 'number') row[field.name] = 0;
    else if (field.type === 'date') row[field.name] = new Date().toISOString().slice(0, 10);
    else if (field.options?.length) row[field.name] = field.options[0].value;
    else row[field.name] = '';
  }
  if (entityKey === 'teachers') row.id = generateNextTeacherCode(rows as unknown as { id: string }[]);
  if (entityKey === 'degrees' && !row.createdAt) row.createdAt = new Date().toISOString().slice(0, 10);
  if (entityKey === 'departments' && !row.createdAt) row.createdAt = new Date().toISOString().slice(0, 10);
  return row;
}

function createId(entityKey: EntityKey, rows: Row[], prefix: string): string {
  const next = rows.length + 1;
  const candidate = `${prefix}-${String(next).padStart(3, '0')}`;
  if (!rows.some((row) => row.id === candidate)) return candidate;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeRow(row: Row, fields: FieldConfig[]): Row {
  const normalized: Row = { id: row.id };
  for (const field of fields) {
    normalized[field.name] = field.type === 'number' ? Number(row[field.name]) : row[field.name];
  }
  return normalized;
}

function validateRow(entityKey: EntityKey, row: Row, fields: FieldConfig[], data: AppData): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    if (field.required && (row[field.name] === '' || row[field.name] === undefined || row[field.name] === null)) {
      errors.push(`${field.label} là bắt buộc.`);
    }
  }
  if (entityKey === 'teachers') {
    errors.push(...validateTeacher(row as unknown as Parameters<typeof validateTeacher>[0]));
  }
  if (entityKey === 'degrees') {
    const duplicated = data.degrees.some((item) => item.shortName === row.shortName && item.id !== row.id);
    if (duplicated) errors.push('Tên viết tắt đã tồn tại.');
  }
  if (entityKey === 'departments') {
    const duplicated = data.departments.some((item) => item.code === row.code && item.id !== row.id);
    if (duplicated) errors.push('Mã khoa đã tồn tại.');
  }
  return errors;
}

function canDelete(entityKey: EntityKey, id: string, data: AppData): { ok: boolean; message: string } {
  if (entityKey === 'degrees' && data.teachers.some((teacher) => teacher.degreeId === id)) {
    return { ok: false, message: 'Không thể xoá bằng cấp này vì vẫn có giáo viên có bằng cấp này.' };
  }
  if (entityKey === 'departments' && data.teachers.some((teacher) => teacher.departmentId === id)) {
    return { ok: false, message: 'Không thể xoá khoa này vì vẫn còn giáo viên thuộc khoa này.' };
  }
  if (entityKey === 'subjects' && data.classes.some((classItem) => classItem.subjectId === id)) {
    return { ok: false, message: 'Không thể xoá học phần đang có lớp học phần.' };
  }
  if (entityKey === 'semesters' && data.classes.some((classItem) => classItem.semesterId === id)) {
    return { ok: false, message: 'Không thể xoá kỳ học đang có lớp học phần.' };
  }
  if (entityKey === 'classes' && data.assignments.some((assignment) => assignment.classId === id)) {
    return { ok: false, message: 'Không thể xoá lớp học phần đã được phân công giảng viên.' };
  }
  if (entityKey === 'teachers' && data.assignments.some((assignment) => assignment.teacherId === id)) {
    return { ok: false, message: 'Không thể xoá giáo viên đã có phân công giảng dạy.' };
  }
  return { ok: true, message: '' };
}

export type { FieldConfig };
