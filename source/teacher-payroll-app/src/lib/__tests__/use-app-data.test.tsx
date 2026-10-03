/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { initialData } from '../initial-data';
import { useAppData } from '../use-app-data';
import type { AppData } from '../types';

const STORAGE_KEY = 'n01-g11-teacher-payroll-data-v3';
const originalFetch = globalThis.fetch;
const originalStructuredClone = globalThis.structuredClone;
const fetchMock = jest.fn();

function mockResponse(body: unknown, status = 200, version: string | null = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => name === 'X-State-Version' ? version : null },
    json: async () => body
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
  window.localStorage.clear();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  globalThis.structuredClone = originalStructuredClone;
});

test('tải dữ liệu từ máy chủ, lưu cache và dùng phiên bản mới cho lần ghi tiếp theo', async () => {
  const remote = {
    ...initialData,
    teachers: initialData.teachers.slice(0, 1),
    assignments: initialData.assignments.filter((assignment) => assignment.teacherId === 'GV0001')
  };
  fetchMock
    .mockResolvedValueOnce(mockResponse(remote, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-2'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(hook.result.current.data.teachers).toHaveLength(1);
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').teachers).toHaveLength(1);

  const newTeacher = { ...initialData.teachers[1], id: 'GV0099', email: 'gv0099@example.com' };
  let saved: Awaited<ReturnType<typeof hook.result.current.addItem>> | undefined;
  await act(async () => {
    saved = await hook.result.current.addItem('teachers', newTeacher);
  });
  expect(saved).toEqual({ ok: true });
  expect(fetchMock.mock.calls[1][0]).toBe('/api/state');
  expect(fetchMock.mock.calls[1][1].headers['X-State-Version']).toBe('version-1');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).teachers).toHaveLength(2);
  expect(hook.result.current.data.teachers).toHaveLength(2);
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').teachers).toHaveLength(2);
  expect(hook.result.current.saving).toBe(false);
});

test('khi offline dùng cache hợp lệ ở chế độ chỉ đọc và không gửi yêu cầu lưu', async () => {
  const cached: AppData = {
    ...initialData,
    teachers: initialData.teachers.slice(0, 2),
    assignments: initialData.assignments.filter((assignment) => ['GV0001', 'GV0002'].includes(assignment.teacherId))
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  fetchMock.mockRejectedValue(new Error('Mất mạng'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(hook.result.current.data.teachers).toHaveLength(2);
  expect(hook.result.current.loadError).toContain('Mất mạng');
  let saved: Awaited<ReturnType<typeof hook.result.current.addItem>> | undefined;
  await act(async () => {
    saved = await hook.result.current.addItem('teachers', initialData.teachers[2]);
  });
  expect(saved?.ok).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(hook.result.current.data.teachers).toHaveLength(2);
});

test('bỏ cache hỏng và không coi dữ liệu thiếu phiên bản là có thể lưu', async () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ teachers: null }));
  fetchMock.mockResolvedValueOnce(mockResponse({ ...initialData, teachers: [] }));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(hook.result.current.data.teachers).toHaveLength(0);
  expect(hook.result.current.loadError).toContain('không trả phiên bản dữ liệu');
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').teachers).toBeNull();
  await act(async () => {
    expect(await hook.result.current.resetData()).toMatchObject({ ok: false });
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('dữ liệu máy chủ sai cấu trúc không được đưa vào cache hay thay bằng số liệu mẫu', async () => {
  fetchMock.mockResolvedValueOnce(mockResponse({ ...initialData, teachers: null }, 200, 'version-1'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(Object.values(hook.result.current.data).every((rows) => rows.length === 0)).toBe(true);
  expect(hook.result.current.loadError).toContain('Dữ liệu từ máy chủ không hợp lệ');
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  await act(async () => {
    expect(await hook.result.current.addItem('teachers', initialData.teachers[0])).toMatchObject({ ok: false });
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('phản hồi máy chủ thiếu danh mục không được ghép âm thầm với dữ liệu mẫu', async () => {
  fetchMock.mockResolvedValueOnce(mockResponse({ teachers: [] }, 200, 'version-1'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(Object.values(hook.result.current.data).every((rows) => rows.length === 0)).toBe(true);
  expect(hook.result.current.loadError).toContain('Dữ liệu từ máy chủ không hợp lệ');
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('cache thiếu danh mục bị bỏ qua khi mất kết nối', async () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ teachers: [] }));
  fetchMock.mockRejectedValueOnce(new Error('Mất mạng'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(Object.values(hook.result.current.data).every((rows) => rows.length === 0)).toBe(true);
  expect(hook.result.current.loadError).toContain('Mất mạng');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('localStorage bị chặn không làm mất snapshot đã xác nhận trong bộ nhớ khi tải lại offline', async () => {
  const setCache = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled'); });
  const getCache = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage disabled'); });
  const remote: AppData = { ...initialData, paymentRates: initialData.paymentRates.map((rate) => ({ ...rate, amount: rate.amount + 3000 })) };
  try {
    fetchMock.mockResolvedValueOnce(mockResponse(remote, 200, 'version-1')).mockRejectedValueOnce(new Error('Mất mạng'));
    const hook = renderHook(() => useAppData());
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    expect(hook.result.current.data).toEqual(remote);
    expect(hook.result.current.loadError).toBe('');
    await act(async () => { await hook.result.current.reloadData(); });
    expect(hook.result.current.data).toEqual(remote);
    expect(hook.result.current.loadError).toContain('bản sao gần nhất');
    await act(async () => { expect(await hook.result.current.resetData()).toMatchObject({ ok: false }); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally {
    setCache.mockRestore();
    getCache.mockRestore();
  }
});

test('xung đột khi lưu giữ nguyên dữ liệu và cache, trả dấu hiệu để giao diện tải lại', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ error: 'Dữ liệu đã thay đổi.' }, 409));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  const cachedBefore = window.localStorage.getItem(STORAGE_KEY);
  let saved: Awaited<ReturnType<typeof hook.result.current.addItem>> | undefined;
  await act(async () => {
    saved = await hook.result.current.addItem('teachers', { ...initialData.teachers[0], id: 'GV0099' });
  });
  expect(saved).toEqual({ ok: false, error: 'Dữ liệu đã thay đổi.', conflict: true });
  expect(hook.result.current.data).toEqual(initialData);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(cachedBefore);
});

test('sau xung đột, tải lại lấy phiên bản mới để lần lưu tiếp theo thành công', async () => {
  const newerData = {
    ...initialData,
    paymentRates: initialData.paymentRates.map((rate) =>
      rate.year === '2025-2026' ? { ...rate, amount: rate.amount + 1000 } : rate
    )
  };
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ error: 'Xung đột.' }, 409))
    .mockResolvedValueOnce(mockResponse(newerData, 200, 'version-2'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-3'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  await act(async () => {
    expect(await hook.result.current.addItem('teachers', { ...initialData.teachers[0], id: 'GV0099' })).toMatchObject({
      ok: false, conflict: true
    });
  });

  await act(async () => { await hook.result.current.reloadData(); });
  expect(hook.result.current.loadError).toBe('');
  expect(hook.result.current.data.paymentRates[1].amount).toBe(initialData.paymentRates[1].amount + 1000);
  await act(async () => {
    expect(await hook.result.current.addItem('teachers', {
      ...initialData.teachers[0], id: 'GV0099', email: 'gv0099@example.com', phone: '0999999999'
    })).toEqual({ ok: true });
  });
  expect(fetchMock.mock.calls[3][1].headers['X-State-Version']).toBe('version-2');
  expect(JSON.parse(fetchMock.mock.calls[3][1].body).paymentRates[1].amount).toBe(initialData.paymentRates[1].amount + 1000);
});

test('hai thao tác liên tiếp dùng dữ liệu và phiên bản mới nhất; saving chỉ tắt khi cả hai xong', async () => {
  let finishFirst!: (response: Response) => void;
  let finishSecond!: (response: Response) => void;
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishFirst = resolve; }))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishSecond = resolve; }));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));

  let first!: ReturnType<typeof hook.result.current.addItem>;
  let second!: ReturnType<typeof hook.result.current.addItem>;
  act(() => {
    first = hook.result.current.addItem('teachers', { ...initialData.teachers[0], id: 'GV0099' });
    second = hook.result.current.addItem('teachers', { ...initialData.teachers[1], id: 'GV0100' });
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(hook.result.current.saving).toBe(true);
  await act(async () => {
    finishFirst(mockResponse({ ok: true }, 200, 'version-2'));
    await first;
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(hook.result.current.saving).toBe(true);
  expect(fetchMock.mock.calls[2][1].headers['X-State-Version']).toBe('version-2');
  expect(JSON.parse(fetchMock.mock.calls[2][1].body).teachers).toHaveLength(initialData.teachers.length + 2);

  await act(async () => {
    finishSecond(mockResponse({ ok: true }, 200, 'version-3'));
    await second;
  });
  expect(hook.result.current.saving).toBe(false);
  expect(hook.result.current.data.teachers).toHaveLength(initialData.teachers.length + 2);
});

test('thiếu phiên bản mới trong phản hồi ghi buộc tải lại, không cập nhật giao diện như đã lưu', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ ok: true }));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  await act(async () => {
    expect(await hook.result.current.resetData()).toEqual({
      ok: false,
      error: 'Máy chủ đã lưu nhưng không trả phiên bản dữ liệu mới. Hãy tải lại trang.'
    });
  });
  expect(hook.result.current.data).toEqual(initialData);
  await act(async () => {
    expect(await hook.result.current.resetData()).toMatchObject({ ok: false });
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(hook.result.current.loadError).toContain('Hãy tải lại');
});

test('phản hồi tải cũ tới sau không ghi đè dữ liệu và phiên bản của lần tải mới', async () => {
  let finishOld!: (response: Response) => void;
  const newer: AppData = { ...initialData, paymentRates: initialData.paymentRates.map((rate) => ({ ...rate, amount: rate.amount + 1000 })) };
  fetchMock
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishOld = resolve; }))
    .mockResolvedValueOnce(mockResponse(newer, 200, 'version-new'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-saved'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await act(async () => { await hook.result.current.reloadData(); });
  await act(async () => { finishOld(mockResponse(initialData, 200, 'version-old')); });
  expect(hook.result.current.data).toEqual(newer);
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(newer);
  await act(async () => { await hook.result.current.resetData(); });
  expect(fetchMock.mock.calls[2][1].headers['X-State-Version']).toBe('version-new');
});

test('lỗi của lần tải cũ không chuyển lần tải mới thành chế độ chỉ đọc', async () => {
  let failOld!: (error: Error) => void;
  fetchMock
    .mockImplementationOnce(() => new Promise<Response>((_resolve, reject) => { failOld = reject; }))
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-new'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await act(async () => { await hook.result.current.reloadData(); });
  await act(async () => { failOld(new Error('request cũ mất mạng')); });
  expect(hook.result.current.loadError).toBe('');
  expect(hook.result.current.loaded).toBe(true);
});

test('tải lại chờ thao tác ghi hoàn tất và không cho lưu bằng phiên bản cũ trong lúc tải', async () => {
  let finishSave!: (response: Response) => void;
  let finishReload!: (response: Response) => void;
  const saved: AppData = { ...initialData, paymentRates: initialData.paymentRates.map((rate) => ({ ...rate, amount: rate.amount + 1000 })) };
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishSave = resolve; }))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishReload = resolve; }));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  let mutation!: ReturnType<typeof hook.result.current.restoreData>;
  let reload!: Promise<void>;
  act(() => { mutation = hook.result.current.restoreData(saved); });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  act(() => { reload = hook.result.current.reloadData(); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => { finishSave(mockResponse({ ok: true }, 200, 'version-2')); await mutation; });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  await act(async () => { expect(await hook.result.current.resetData()).toMatchObject({ ok: false }); });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await act(async () => { finishReload(mockResponse(saved, 200, 'version-2')); await reload; });
  expect(hook.result.current.data).toEqual(saved);
});

test('thêm nhiều giáo viên, cập nhật định mức và xoá khoa dùng đúng dữ liệu mới nhất', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-2'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-3'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-4'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  const newTeachers = [
    { ...initialData.teachers[0], id: 'GV0099', email: 'gv0099@example.com', phone: '0999999998' },
    { ...initialData.teachers[1], id: 'GV0100', email: 'gv0100@example.com', phone: '0999999999' }
  ];
  await act(async () => {
    expect(await hook.result.current.addItems('teachers', newTeachers)).toEqual({ ok: true });
  });
  expect(hook.result.current.data.teachers.slice(-2)).toEqual(newTeachers);
  const afterAdd = JSON.parse(fetchMock.mock.calls[1][1].body) as AppData;
  expect(afterAdd.teachers.slice(-2)).toEqual(newTeachers);
  expect(fetchMock.mock.calls[1][1].headers['X-State-Version']).toBe('version-1');

  const updatedRate = { ...initialData.paymentRates[1], amount: 151000 };
  await act(async () => {
    expect(await hook.result.current.updateItem('paymentRates', updatedRate.id, updatedRate)).toEqual({ ok: true });
  });
  expect(hook.result.current.data.paymentRates[1]).toEqual(updatedRate);
  expect(hook.result.current.data.paymentRates[0]).toEqual(initialData.paymentRates[0]);
  const afterUpdate = JSON.parse(fetchMock.mock.calls[2][1].body) as AppData;
  expect(afterUpdate.paymentRates[1]).toEqual(updatedRate);
  expect(afterUpdate.teachers.slice(-2)).toEqual(newTeachers);
  expect(fetchMock.mock.calls[2][1].headers['X-State-Version']).toBe('version-2');

  await act(async () => {
    expect(await hook.result.current.removeItem('departments', 'DEP-NN')).toEqual({ ok: true });
  });
  expect(hook.result.current.data.departments.some((item) => item.id === 'DEP-NN')).toBe(false);
  const afterRemove = JSON.parse(fetchMock.mock.calls[3][1].body) as AppData;
  expect(afterRemove.departments.some((item) => item.id === 'DEP-NN')).toBe(false);
  expect(afterRemove.paymentRates[1]).toEqual(updatedRate);
  expect(fetchMock.mock.calls[3][1].headers['X-State-Version']).toBe('version-3');
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(afterRemove);
});

test('đặt lại dữ liệu mẫu chỉ cập nhật giao diện và cache sau khi máy chủ xác nhận', async () => {
  const customized = {
    ...initialData,
    paymentRates: initialData.paymentRates.map((rate) =>
      rate.year === '2025-2026' ? { ...rate, amount: 160000 } : rate
    )
  };
  fetchMock
    .mockResolvedValueOnce(mockResponse(customized, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-2'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(hook.result.current.data.paymentRates[1].amount).toBe(160000);
  await act(async () => {
    expect(await hook.result.current.resetData()).toEqual({ ok: true });
  });
  const savedBody = JSON.parse(fetchMock.mock.calls[1][1].body) as AppData;
  expect(savedBody).toEqual(initialData);
  expect(savedBody).not.toBe(initialData);
  expect(hook.result.current.data).toEqual(initialData);
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(initialData);
});

test('khôi phục snapshot backup tuần tự qua API và chỉ cập nhật sau khi xác nhận', async () => {
  const customized: AppData = {
    ...initialData,
    paymentRates: initialData.paymentRates.map((rate) =>
      rate.year === '2025-2026' ? { ...rate, amount: rate.amount + 5000 } : rate
    )
  };
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-2'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));

  await act(async () => {
    expect(await hook.result.current.restoreData(customized)).toEqual({ ok: true });
  });

  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(customized);
  expect(hook.result.current.data).toEqual(customized);
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(customized);
});

test('ghi đầu mất mạng không làm thao tác sau dùng dữ liệu chưa lưu hoặc phiên bản sai', async () => {
  fetchMock
    .mockResolvedValueOnce(mockResponse(initialData, 200, 'version-1'))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(mockResponse({ ok: true }, 200, 'version-2'));
  const hook = renderHook(() => useAppData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  let first!: ReturnType<typeof hook.result.current.addItems>;
  let second!: ReturnType<typeof hook.result.current.updateItem>;
  act(() => {
    first = hook.result.current.addItems('teachers', [{
      ...initialData.teachers[0], id: 'GV0099', email: 'gv0099@example.com', phone: '0999999999'
    }]);
    second = hook.result.current.updateItem('paymentRates', 'RATE-2025', {
      ...initialData.paymentRates[1], amount: 151000
    });
  });
  await act(async () => {
    expect(await first).toEqual({ ok: false, error: 'Mất kết nối khi lưu. Dữ liệu trên màn hình chưa bị thay đổi.' });
    expect(await second).toEqual({ ok: true });
  });
  const secondBody = JSON.parse(fetchMock.mock.calls[2][1].body) as AppData;
  expect(secondBody.teachers).toEqual(initialData.teachers);
  expect(secondBody.paymentRates[1].amount).toBe(151000);
  expect(fetchMock.mock.calls[1][1].headers['X-State-Version']).toBe('version-1');
  expect(fetchMock.mock.calls[2][1].headers['X-State-Version']).toBe('version-1');
  expect(hook.result.current.data).toEqual(secondBody);
  expect(hook.result.current.saving).toBe(false);
});
