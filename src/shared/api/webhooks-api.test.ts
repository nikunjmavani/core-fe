import { beforeEach, describe, expect, it, vi } from 'vitest';

const useMockApiRef = vi.hoisted(() => ({ value: false }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get useMockApi() {
      return useMockApiRef.value;
    },
  },
}));

const { getMock, postMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, delete: deleteMock },
}));

import { webhookMockStore } from './webhook-mock-store.ts';
import { createWebhook, deleteWebhook, listWebhooks } from './webhooks-api.ts';

const WIRE = {
  id: `whk_${'0'.repeat(20)}1`,
  url: 'https://x.test/hook',
  events: ['member.created'],
  active: true,
  created_at: '2026-06-01T00:00:00.000Z',
};

beforeEach(() => {
  useMockApiRef.value = false;
  getMock.mockReset();
  postMock.mockReset();
  deleteMock.mockReset();
  webhookMockStore.reset();
});

describe('webhooks-api (live branch)', () => {
  it('lists and maps wire → domain', async () => {
    getMock.mockResolvedValue({ data: [WIRE] });
    const res = await listWebhooks();
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining('/tenancy/organization/webhooks'),
    );
    expect(res).toEqual([
      {
        id: WIRE.id,
        url: 'https://x.test/hook',
        events: ['member.created'],
        active: true,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
  });

  it('creates via POST', async () => {
    postMock.mockResolvedValue({ data: WIRE });
    await createWebhook({ url: 'https://x.test/hook', events: ['member.created'] });
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/tenancy/organization/webhooks'),
      { url: 'https://x.test/hook', events: ['member.created'] },
    );
  });

  it('deletes via DELETE', async () => {
    deleteMock.mockResolvedValue({ data: null });
    await deleteWebhook(WIRE.id);
    expect(deleteMock).toHaveBeenCalledWith(
      expect.stringContaining(`/webhooks/${WIRE.id}`),
    );
  });
});

describe('webhooks-api (mock branch)', () => {
  beforeEach(() => {
    useMockApiRef.value = true;
  });

  it('lists, creates, and deletes against the mock store', async () => {
    const before = await listWebhooks();
    expect(before.length).toBeGreaterThanOrEqual(1);

    const created = await createWebhook({
      url: 'https://new.test/hook',
      events: ['role.changed'],
    });
    expect(created.url).toBe('https://new.test/hook');
    expect((await listWebhooks()).some((w) => w.id === created.id)).toBe(true);

    await deleteWebhook(created.id);
    expect((await listWebhooks()).some((w) => w.id === created.id)).toBe(false);
  });
});
