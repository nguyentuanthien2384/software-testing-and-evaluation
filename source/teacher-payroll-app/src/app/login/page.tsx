'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Đã đăng nhập thì chuyển thẳng về trang chủ.
  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(username, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    router.replace('/');
  }

  return (
    <main className="login-page" data-testid="login-page">
      <section className="login-card" aria-label="Đăng nhập">
        <div className="login-brand">
          <div className="brand-icon">P</div>
          <div>
            <strong>Hệ thống Quản lý</strong>
            <span>Tiền dạy giáo viên - N01 G11</span>
          </div>
        </div>

        <h1 className="login-title">Đăng nhập</h1>
        <p className="login-subtitle">Đăng nhập bằng tài khoản quản trị viên hoặc kiểm thử viên.</p>

        <form className="login-form" data-testid="login-form" onSubmit={handleSubmit}>
          <label>
            Tên đăng nhập
            <input
              data-testid="login-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin hoặc tester"
            />
          </label>
          <label>
            Mật khẩu
            <input
              data-testid="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
            />
          </label>

          {error && (
            <p className="error-message" data-testid="login-error" role="alert">{error}</p>
          )}

          <button className="primary-btn login-submit" data-testid="login-submit" type="submit">
            Đăng nhập
          </button>
        </form>

        <div className="login-hint" data-testid="login-hint">
          <p className="muted">Tài khoản demo:</p>
          <ul>
            <li><strong>admin</strong> / admin@123 — toàn quyền</li>
            <li><strong>tester</strong> / tester@123 — chỉ xem &amp; kiểm thử</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
