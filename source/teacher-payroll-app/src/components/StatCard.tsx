import { ReactNode } from 'react';

export function StatCard({ title, value, note }: { title: string; value: ReactNode; note?: string }) {
  return (
    <article className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
