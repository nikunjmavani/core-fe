import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from './useNotifications.ts';

const { listMock, countMock, markReadMock, markAllMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  countMock: vi.fn(),
  markReadMock: vi.fn(),
  markAllMock: vi.fn(),
}));
vi.mock('@/shared/api/notifications-api.ts', () => ({
  listNotifications: listMock,
  getUnreadCount: countMock,
  markNotificationRead: markReadMock,
  markAllNotificationsRead: markAllMock,
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

const ITEM = {
  id: 'ntf_a',
  category: 'system',
  title: 'T',
  body: 'B',
  isRead: false,
  href: null,
  createdAt: '2026-06-23T00:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue([ITEM]);
  countMock.mockResolvedValue(3);
  markReadMock.mockResolvedValue(undefined);
  markAllMock.mockResolvedValue(undefined);
});

describe('useNotifications', () => {
  it('loads the inbox list', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([ITEM]);
  });

  it('loads the unread count', async () => {
    const { result } = renderHook(() => useUnreadCount(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
  });

  it('marks one notification read', async () => {
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    result.current.mutate('ntf_a');
    await waitFor(() => expect(markReadMock).toHaveBeenCalledWith('ntf_a'));
  });

  it('marks all notifications read', async () => {
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(markAllMock).toHaveBeenCalledTimes(1));
  });
});
