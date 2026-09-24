'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { createBackup, parseBackup } from '@/lib/backup';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

const MAX_BACKUP_SIZE = 5 * 1024 * 1024;

export function SystemPage() {
  const { data, resetData, restoreData, saving } = useAppData();
  const { can } = useAuth();
  const canReset = can('system:reset');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState(false);

  async function handleReset() {
    if (!confirm('Reset toàn bộ dữ liệu demo?')) return;
    const result = await resetData();
    setMessage(result.ok ? 'Đã khôi phục dữ liệu mẫu trong cơ sở dữ liệu.' : result.error);
  }

  function handleExport() {
    const blob = new Blob([createBackup(data)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `teacher-payroll-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Đã xuất file backup dữ liệu.');
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_SIZE) {
      setMessage('File backup vượt quá giới hạn 5 MB.');
      return;
    }
    if (!confirm('Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại. Bạn có muốn tiếp tục?')) return;

    setRestoring(true);
    try {
      const validation = parseBackup(await file.text());
      if (!validation.ok) {
        setMessage(`Backup không hợp lệ: ${validation.errors[0]}`);
        return;
      }
      const result = await restoreData(validation.data);
      setMessage(result.ok ? 'Đã khôi phục dữ liệu từ file backup.' : result.error);
    } catch {
      setMessage('Không thể đọc file backup.');
    } finally {
      setRestoring(false);
    }
  }

  const busy = saving || restoring;

  return (
    <main className="page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">Hệ thống</p>
          <h1>Cấu hình và dữ liệu demo</h1>
          <p>Quản lý dữ liệu mẫu, sao lưu và khôi phục dữ liệu phục vụ demo, kiểm thử GUI và Selenium.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Backup và khôi phục</h2>
        <p>Backup được xuất dưới dạng JSON có phiên bản, chỉ file được tạo từ hệ thống mới được chấp nhận khi khôi phục.</p>
        {canReset ? (
          <div className="inline-tool">
            <button type="button" data-testid="system-export-button" disabled={busy} onClick={handleExport}>Xuất backup</button>
            <button type="button" data-testid="system-import-button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              {restoring ? 'Đang khôi phục...' : 'Khôi phục từ backup'}
            </button>
            <input
              ref={fileInputRef}
              data-testid="system-import-input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleImport(event)}
              style={{ display: 'none' }}
            />
          </div>
        ) : null}
      </section>
      <section className="panel">
        <h2>Reset dữ liệu</h2>
        <p>Dữ liệu chính được lưu trong SQLite; trình duyệt chỉ giữ một bản sao dự phòng để xem khi mất kết nối. Nhấn nút dưới đây để khôi phục dữ liệu gốc.</p>
        {canReset ? (
          <button className="danger-btn" data-testid="system-reset-button" type="button" disabled={busy} onClick={() => void handleReset()}>
            {saving ? 'Đang khôi phục...' : 'Reset dữ liệu demo'}
          </button>
        ) : (
          <p className="error-message" data-testid="system-reset-denied">Chỉ tài khoản quản trị viên mới được quản lý dữ liệu hệ thống.</p>
        )}
        {message && <p className={message.startsWith('Đã') ? 'success-message' : 'error-message'} role="status">{message}</p>}
      </section>
    </main>
  );
}
