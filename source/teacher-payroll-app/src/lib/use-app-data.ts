'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { initialData } from './initial-data';
import { AppData, EntityKey } from './types';

const STORAGE_KEY = 'n01-g11-teacher-payroll-data-v3';

/**
 * Hook quản lý dữ liệu ứng dụng.
 * Nguồn dữ liệu chính: API /api/state (được Prisma đọc/ghi xuống SQLite).
 * localStorage chỉ đóng vai trò cache offline khi không gọi được API.
 */
export function useAppData() {
  const [data, setData] = useState<AppData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const hydrating = useRef(true);

  // Nạp dữ liệu khi khởi động: ưu tiên CSDL (qua API), fallback localStorage -> dữ liệu mẫu.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) throw new Error('API state lỗi');
        const remote = (await res.json()) as AppData;
        if (active) setData({ ...initialData, ...remote });
      } catch {
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          if (stored && active) setData({ ...initialData, ...JSON.parse(stored) });
        } catch {
          if (active) setData(initialData);
        }
      } finally {
        if (active) {
          setLoaded(true);
          hydrating.current = false;
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Ghi dữ liệu: cache vào localStorage + write-through xuống SQLite qua API.
  useEffect(() => {
    if (!loaded || hydrating.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* bỏ qua lỗi cache */
    }
    const controller = new AbortController();
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    }).catch(() => {
      /* offline: dữ liệu vẫn còn trong localStorage, sẽ đồng bộ ở lần lưu sau */
    });
    return () => controller.abort();
  }, [data, loaded]);

  const actions = useMemo(
    () => ({
      addItem<T extends { id: string }>(key: EntityKey, item: T) {
        setData((current) => ({ ...current, [key]: [...(current[key] as unknown as T[]), item] }));
      },
      updateItem<T extends { id: string }>(key: EntityKey, id: string, item: T) {
        setData((current) => ({
          ...current,
          [key]: (current[key] as unknown as T[]).map((row) => (row.id === id ? item : row))
        }));
      },
      removeItem(key: EntityKey, id: string) {
        setData((current) => ({
          ...current,
          [key]: (current[key] as unknown as { id: string }[]).filter((row) => row.id !== id)
        }));
      },
      async resetData() {
        setData(initialData);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
        } catch {
          /* bỏ qua */
        }
        try {
          await fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialData)
          });
        } catch {
          /* offline */
        }
      }
    }),
    []
  );

  return { data, loaded, ...actions };
}
