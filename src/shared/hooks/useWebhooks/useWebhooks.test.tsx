import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateWebhook, useDeleteWebhook, useWebhooks } from './useWebhooks.ts';

const { listMock, createMock, deleteMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/shared/api/webhooks-api.ts', () => ({
  listWebhooks: listMock,
  createWebhook: createMock,
  deleteWebhook: deleteMock,
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

const WEBHOOK = {
  id: 'whk_1',
  url: 'https://x.test/hook',
  events: ['member.created'],
  active: true,
  createdAt: '2026-06-01T00:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue([WEBHOOK]);
  createMock.mockResolvedValue(WEBHOOK);
  deleteMock.mockResolvedValue(undefined);
});

describe('useWebhooks', () => {
  it('loads the webhook list', async () => {
    const { result } = renderHook(() => useWebhooks(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([WEBHOOK]);
  });

  it('creates a webhook', async () => {
    const { result } = renderHook(() => useCreateWebhook(), { wrapper });
    result.current.mutate({ url: 'https://x.test/hook', events: ['member.created'] });
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        url: 'https://x.test/hook',
        events: ['member.created'],
      }),
    );
  });

  it('deletes a webhook', async () => {
    const { result } = renderHook(() => useDeleteWebhook(), { wrapper });
    result.current.mutate('whk_1');
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('whk_1'));
  });
});
