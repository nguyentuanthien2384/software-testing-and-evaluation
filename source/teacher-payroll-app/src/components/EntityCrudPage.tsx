'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AppData, EntityKey } from '@/lib/types';
import { generateNextTeacherCode } from '@/lib/payroll';
import { getSemesterStatus, validateAppData, validateEntityMutation } from '@/lib/app-data-validation';
import { buildTeachingClassBatch } from '@/lib/class-generation';
import { copyDegreeCoefficients, nextAcademicYear } from '@/lib/coefficient-copy';
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
  allowBulkCreate?: boolean;
  allowCopyPreviousYear?: boolean;
};

type Row = Record<string, string | number> & { id: string };

export function EntityCrudPage({ entityKey, title, description, fields, idPrefix, searchPlaceholder, allowBulkCreate = false, allowCopyPreviousYear = false }: EntityCrudPageProps) {
  const { data, loaded, saving, loadError, reloadData, addItem, addItems, updateItem, removeItem } = useAppData();
  const { can } = useAuth();
  const canManage = can('data:manage');
  const rows = data[entityKey] as unknown as Row[];
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Row>(() => buildEmptyRow(fields, entityKey, rows, idPrefix));
  const [message, setMessage] = useState<string>('');
  const [batchCount, setBatchCount] = useState(1);
  const [copySourceYear, setCopySourceYear] = useState('');
  const [copyTargetYear, setCopyTargetYear] = useState('');

  const visibleFields = fields.filter((field) => !field.tableOnly);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [query, rows]);

  // Tạo mã dựa trên dữ liệu thật sau khi API hoàn tất, tránh trùng mã từ dữ liệu mẫu ban đầu.
  useEffect(() => {
    if (loaded && !editingId) setForm(buildEmptyRow(fields, entityKey, rows, idPrefix));
  }, [loaded, rows, editingId, fields, entityKey, idPrefix]);

  const coefficientYears = useMemo(
    () => Array.from(new Set(data.degreeCoefficients.map((item) => item.year))).sort(),
    [data.degreeCoefficients]
  );

  useEffect(() => {
    if (!allowCopyPreviousYear || !loaded || copySourceYear || coefficientYears.length === 0) return;
    const latest = coefficientYears[coefficientYears.length - 1];
    setCopySourceYear(latest);
    setCopyTargetYear(nextAcademicYear(latest));
  }, [allowCopyPreviousYear, loaded, copySourceYear, coefficientYears]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      setMessage('Bạn không có quyền thay đổi dữ liệu (chỉ tài khoản quản trị viên).');
      return;
    }
    if (!loaded || saving || loadError) {
      setMessage(loadError || 'Dữ liệu đang được tải. Vui lòng chờ.');
      return;
    }
    const normalized = normalizeRow(form, visibleFields);
    const errors = validateRow(normalized, visibleFields);
    if (!editingId && allowBulkCreate && entityKey === 'classes' && batchCount !== 1) {
      errors.push(...validateEntityMutation(entityKey, normalized, data, editingId));
      if (errors.length > 0) {
        setMessage(Array.from(new Set(errors)).join(' '));
        return;
      }
      const batch = buildTeachingClassBatch(
        normalized as unknown as AppData['classes'][number],
        batchCount,
        data.classes
      );
      if (!batch.ok) {
        setMessage(batch.error);
        return;
      }
      const validation = validateAppData({ ...data, classes: [...data.classes, ...batch.classes] });
      if (!validation.ok) {
        setMessage(validation.errors.join(' '));
        return;
      }
      const result = await addItems(entityKey, batch.classes);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Đã thêm ${batch.classes.length} lớp học phần thành công.`);
      setBatchCount(1);
      startCreate({ keepMessage: true });
      return;
    }
    errors.push(...validateEntityMutation(entityKey, normalized, data, editingId));
    if (errors.length > 0) {
      setMessage(Array.from(new Set(errors)).join(' '));
      return;
    }

    const result = editingId
      ? await updateItem(entityKey, editingId, normalized)
      : await addItem(entityKey, normalized);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(editingId ? 'Cập nhật dữ liệu thành công.' : 'Thêm dữ liệu thành công.');
    startCreate({ keepMessage: true });
  }

  async function handleDelete(row: Row) {
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
      const result = await removeItem(entityKey, row.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage('Đã xoá dữ liệu.');
      if (editingId === row.id) startCreate();
    }
  }

  async function handleCopyCoefficients() {
    if (!canManage || saving) return;
    const copy = copyDegreeCoefficients(data, copySourceYear, copyTargetYear);
    if (!copy.ok) {
      setMessage(copy.error);
      return;
    }
    const validation = validateAppData({
      ...data,
      degreeCoefficients: [...data.degreeCoefficients, ...copy.coefficients]
    });
    if (!validation.ok) {
      setMessage(validation.errors.join(' '));
      return;
    }
    const result = await addItems('degreeCoefficients', copy.coefficients);
    setMessage(result.ok ? `Đã sao chép ${copy.coefficients.length} hệ số sang năm ${copyTargetYear}.` : result.error);
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
        {!loaded && <div className="panel full-width-notice">Đang tải dữ liệu...</div>}
        {loadError && (
          <div className="panel full-width-notice error-message" role="alert">
            {loadError} <button className="ghost-btn" type="button" onClick={() => void reloadData()}>Tải lại</button>
          </div>
        )}
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
                  {renderField(field, form, setForm, data, saving || !loaded || Boolean(loadError) || (Boolean(editingId) && field.name === 'id'))}
                </label>
              ))}
              {allowBulkCreate && !editingId && (
                <label>
                  Số lượng lớp
                  <input data-testid="classes-batch-count" type="number" min="1" max="50" value={batchCount} disabled={saving || !loaded || Boolean(loadError)} onChange={(event) => setBatchCount(Number(event.target.value))} />
                </label>
              )}
              <button className="primary-btn full" data-testid={`${entityKey}-submit-button`} type="submit" disabled={saving || !loaded || Boolean(loadError)}>{saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm'}</button>
            </form>
            {message && <p data-testid={`${entityKey}-form-message`} className={message.includes('thành công') || message.includes('Đã') ? 'success-message' : 'error-message'}>{message}</p>}
            {allowCopyPreviousYear && (
              <div className="inline-tool">
                <h3>Sao chép từ năm trước</h3>
                <label>
                  Năm nguồn
                  <select data-testid="degree-coefficients-copy-source" value={copySourceYear} disabled={saving} onChange={(event) => { setCopySourceYear(event.target.value); setCopyTargetYear(nextAcademicYear(event.target.value)); }}>
                    {coefficientYears.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Năm đích
                  <input data-testid="degree-coefficients-copy-target" value={copyTargetYear} disabled={saving} onChange={(event) => setCopyTargetYear(event.target.value)} placeholder="YYYY-YYYY" />
                </label>
                <button className="ghost-btn" data-testid="degree-coefficients-copy-button" type="button" disabled={saving || !loaded || Boolean(loadError)} onClick={() => void handleCopyCoefficients()}>Sao chép hệ số</button>
              </div>
            )}
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
                    {fields.map((field) => <td key={field.name}>{displayValue(field, row[field.name], data, entityKey, row)}</td>)}
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

function renderField(field: FieldConfig, form: Row, setForm: (row: Row) => void, data: AppData, disabled: boolean) {
  const value = form[field.name] ?? '';
  const common = {
    name: field.name,
    'data-testid': `field-${field.name}`,
    required: field.required,
    value: String(value),
    placeholder: field.placeholder,
    disabled,
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

function displayValue(field: FieldConfig, value: string | number, data: AppData, entityKey: EntityKey, row: Row): string | number {
  if (entityKey === 'semesters' && field.name === 'periodStatus') {
    return getSemesterStatus(row as unknown as AppData['semesters'][number]);
  }
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
    if (field.name === 'id' || field.tableOnly) continue;
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
    const value = row[field.name];
    normalized[field.name] = field.type === 'number'
      ? Number(value)
      : typeof value === 'string' ? value.trim() : value;
  }
  return normalized;
}

function validateRow(row: Row, fields: FieldConfig[]): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    if (field.required && (row[field.name] === '' || row[field.name] === undefined || row[field.name] === null)) {
      errors.push(`${field.label} là bắt buộc.`);
    }
  }
  return errors;
}

function canDelete(entityKey: EntityKey, id: string, data: AppData): { ok: boolean; message: string } {
  if (entityKey === 'assignments') {
    const assignment = data.assignments.find((item) => item.id === id);
    const teachingClass = assignment ? data.classes.find((item) => item.id === assignment.classId) : undefined;
    const semester = teachingClass ? data.semesters.find((item) => item.id === teachingClass.semesterId) : undefined;
    if (semester?.status === 'Đã khóa') return { ok: false, message: 'Không thể xoá phân công của kỳ học đã khóa.' };
  }
  if (entityKey === 'classes') {
    const teachingClass = data.classes.find((item) => item.id === id);
    const semester = teachingClass ? data.semesters.find((item) => item.id === teachingClass.semesterId) : undefined;
    if (semester?.status === 'Đã khóa') return { ok: false, message: 'Không thể xoá lớp thuộc kỳ học đã khóa.' };
  }
  if (entityKey === 'degrees' && (data.teachers.some((teacher) => teacher.degreeId === id) || data.degreeCoefficients.some((item) => item.degreeId === id))) {
    return { ok: false, message: 'Không thể xoá bằng cấp này vì vẫn có giáo viên hoặc hệ số đang tham chiếu.' };
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
