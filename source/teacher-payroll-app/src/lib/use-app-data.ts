'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initialData } from './initial-data';
import { AppData, EntityKey } from './types';

const STORAGE_KEY = 'n01-g11-teacher-payroll-data-v3';
const VERSION_HEADER = 'X-State-Version';

export type SaveResult = { ok: true } | { ok: false; error: string; conflict?: boolean };

async function responseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    /* dùng thông báo mặc định */
  }
  return `Máy chủ không thể lưu dữ liệu (HTTP ${response.status}).`;
}

/**
 * Dữ liệu chỉ được cập nhật trên giao diện sau khi API xác nhận đã ghi thành công.
 * localStorage là bản sao chỉ đọc khi mất kết nối, không còn tự động ghi ngược lên CSDL.
 */
export function useAppData() {
  const [data, setData] = useState<AppData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const dataRef = useRef<AppData>(initialData);
  const versionRef = useRef<string | null>(null);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());

  const cacheData = useCallback((nextData: AppData) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    } catch {
      /* cache không ảnh hưởng kết quả lưu CSDL */
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoaded(false);
    setLoadError('');
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error(await responseError(response));
      const remote = await response.json() as AppData;
      const nextData = { ...initialData, ...remote };
      versionRef.current = response.headers.get(VERSION_HEADER);
      dataRef.current = nextData;
      setData(nextData);
      cacheData(nextData);
    } catch (error) {
      versionRef.current = null;
      let cached = initialData;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) cached = { ...initialData, ...JSON.parse(stored) } as AppData;
      } catch {
        cached = initialData;
      }
      dataRef.current = cached;
      setData(cached);
      setLoadError(`${error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} Đang hiển thị bản sao gần nhất ở chế độ chỉ đọc.`);
    } finally {
      setLoaded(true);
    }
  }, [cacheData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const persist = useCallback(async (nextData: AppData): Promise<SaveResult> => {
    const version = versionRef.current;
    if (!version) return { ok: false, error: 'Chưa có kết nối với cơ sở dữ liệu. Hãy tải lại trang trước khi lưu.' };

    setSaving(true);
    try {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', [VERSION_HEADER]: version },
        body: JSON.stringify(nextData)
      });
      if (!response.ok) {
        return { ok: false, error: await responseError(response), conflict: response.status === 409 };
      }
      const nextVersion = response.headers.get(VERSION_HEADER);
      if (!nextVersion) return { ok: false, error: 'Máy chủ đã lưu nhưng không trả phiên bản dữ liệu mới. Hãy tải lại trang.' };
      versionRef.current = nextVersion;
      dataRef.current = nextData;
      setData(nextData);
      cacheData(nextData);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Mất kết nối khi lưu. Dữ liệu trên màn hình chưa bị thay đổi.' };
    } finally {
      setSaving(false);
    }
  }, [cacheData]);

  const enqueueMutation = useCallback((build: (current: AppData) => AppData): Promise<SaveResult> => {
    const pending = mutationQueue.current.then(() => persist(build(dataRef.current)));
    mutationQueue.current = pending.then(() => undefined, () => undefined);
    return pending;
  }, [persist]);

  const actions = useMemo(
    () => ({
      addItem<T extends { id: string }>(key: EntityKey, item: T) {
        return enqueueMutation((current) => ({
          ...current,
          [key]: [...(current[key] as unknown as T[]), item]
        }));
      },
      addItems<T extends { id: string }>(key: EntityKey, items: T[]) {
        return enqueueMutation((current) => ({
          ...current,
          [key]: [...(current[key] as unknown as T[]), ...items]
        }));
      },
      updateItem<T extends { id: string }>(key: EntityKey, id: string, item: T) {
        return enqueueMutation((current) => ({
          ...current,
          [key]: (current[key] as unknown as T[]).map((row) => row.id === id ? item : row)
        }));
      },
      removeItem(key: EntityKey, id: string) {
        return enqueueMutation((current) => ({
          ...current,
          [key]: (current[key] as unknown as { id: string }[]).filter((row) => row.id !== id)
        }));
      },
      resetData() {
        return enqueueMutation(() => structuredClone(initialData));
      }
    }),
    [enqueueMutation]
  );

  return { data, loaded, saving, loadError, reloadData: loadData, ...actions };
}
