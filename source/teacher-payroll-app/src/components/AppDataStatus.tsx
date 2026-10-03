'use client';

type AppDataStatusProps = {
  loaded: boolean;
  loadError: string;
  reloadData: () => Promise<void>;
};

/** Không trình bày dữ liệu mẫu đang chờ GET như dữ liệu thật của hệ thống. */
export function AppDataStatus({ loaded, loadError, reloadData }: AppDataStatusProps) {
  if (!loaded) return <section className="panel" role="status">Đang tải dữ liệu...</section>;
  if (!loadError) return null;
  return (
    <section className="panel error-message" role="alert">
      {loadError} <button className="ghost-btn" type="button" onClick={() => void reloadData()}>Tải lại</button>
    </section>
  );
}
