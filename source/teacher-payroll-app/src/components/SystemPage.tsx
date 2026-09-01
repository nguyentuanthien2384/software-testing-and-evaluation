'use client';

import { useState } from 'react';
import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

export function SystemPage() {
  const { resetData, saving } = useAppData();
  const { can } = useAuth();
  const canReset = can('system:reset');
  const [message, setMessage] = useState('');

  async function handleReset() {
    if (!confirm('Reset toàn bộ dữ liệu demo?')) return;
    const result = await resetData();
    setMessage(result.ok ? 'Đã khôi phục dữ liệu mẫu trong cơ sở dữ liệu.' : result.error);
  }

  return (
    <main className="page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">Hệ thống</p>
          <h1>Cấu hình và dữ liệu demo</h1>
          <p>Trang hỗ trợ reset dữ liệu mẫu để phục vụ demo, kiểm thử GUI và Selenium.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Reset dữ liệu</h2>
        <p>Dữ liệu chính được lưu trong SQLite; trình duyệt chỉ giữ một bản sao dự phòng để xem khi mất kết nối. Nhấn nút dưới đây để khôi phục dữ liệu gốc.</p>
        {canReset ? (
          <button className="danger-btn" data-testid="system-reset-button" type="button" disabled={saving} onClick={() => void handleReset()}>{saving ? 'Đang khôi phục...' : 'Reset dữ liệu demo'}</button>
        ) : (
          <p className="error-message" data-testid="system-reset-denied">Chỉ tài khoản quản trị viên mới được reset dữ liệu hệ thống.</p>
        )}
        {message && <p className={message.startsWith('Đã') ? 'success-message' : 'error-message'} role="status">{message}</p>}
      </section>
    </main>
  );
}
