'use client';

import { useAppData } from '@/lib/use-app-data';
import { useAuth } from '@/lib/use-auth';

export function SystemPage() {
  const { resetData } = useAppData();
  const { can } = useAuth();
  const canReset = can('system:reset');

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
        <p>Dữ liệu được lưu trong LocalStorage của trình duyệt. Nhấn nút dưới đây để khôi phục dữ liệu gốc.</p>
        {canReset ? (
          <button className="danger-btn" data-testid="system-reset-button" type="button" onClick={() => { if (confirm('Reset toàn bộ dữ liệu demo?')) resetData(); }}>Reset dữ liệu demo</button>
        ) : (
          <p className="error-message" data-testid="system-reset-denied">Chỉ tài khoản quản trị viên mới được reset dữ liệu hệ thống.</p>
        )}
      </section>
    </main>
  );
}
