import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: { get: getMock, post: postMock, delete: deleteMock },
}));

import { createWebhook, deleteWebhook, listWebhooks } from './webhooks-api.ts';

const WIRE = {
  id: `whk_${'0'.repeat(20)}1`,
  url: 'https://x.test/hook',
  events: ['member.created'],
  is_enabled: true,
  created_at: '2026-06-01T00:00:00.000Z',
};

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  deleteMock.mockReset();
});

describe('webhooks-api', () => {
  it('lists and maps wire → domain', async () => {
    getMock.mockResolvedValue({ data: [WIRE] });
    const res = await listWebhooks();
    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/notify/webhooks'));
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
    expect(postMock).toHaveBeenCalledWith(expect.stringContaining('/notify/webhooks'), {
      url: 'https://x.test/hook',
      events: ['member.created'],
    });
  });

  it('deletes via DELETE', async () => {
    deleteMock.mockResolvedValue({ data: null });
    await deleteWebhook(WIRE.id);
    expect(deleteMock).toHaveBeenCalledWith(
      expect.stringContaining(`/webhooks/${WIRE.id}`),
    );
  });
});
