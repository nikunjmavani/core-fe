import type { CreateWebhookInput, Webhook } from './webhook-contracts.ts';

/**
 * In-memory mock store for outbound webhooks. Demo-only (REPLACE_WITH_API);
 * ids use a deterministic counter so tests stay stable. Reset via {@link reset}.
 */
function whkId(n: number): string {
  return `whk_${String(n).padStart(21, '0')}`;
}

const SEED: Webhook[] = [
  {
    id: whkId(1),
    url: 'https://example.com/hooks/core',
    events: ['member.created', 'billing.updated'],
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

function clone(items: Webhook[]): Webhook[] {
  return items.map((w) => ({ ...w, events: [...w.events] }));
}

let items: Webhook[] = clone(SEED);
let counter = 100;

export const webhookMockStore = {
  list(): Webhook[] {
    return clone(items);
  },
  create(input: CreateWebhookInput): Webhook {
    counter += 1;
    const webhook: Webhook = {
      id: whkId(counter),
      url: input.url,
      events: [...input.events],
      active: true,
      createdAt: '2026-06-24T00:00:00.000Z',
    };
    items = [...items, webhook];
    return { ...webhook, events: [...webhook.events] };
  },
  remove(id: string): void {
    items = items.filter((w) => w.id !== id);
  },
  reset(): void {
    items = clone(SEED);
    counter = 100;
  },
};
