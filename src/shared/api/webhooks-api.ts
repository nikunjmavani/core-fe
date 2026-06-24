import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import {
  type CreateWebhookInput,
  toWebhook,
  type Webhook,
  webhookWireSchema,
} from './webhook-contracts.ts';
import { webhookMockStore } from './webhook-mock-store.ts';

// core-be #795: webhooks moved to /notify/webhooks (gated by webhook:*). The
// fetch client already adds the X-Idempotency-Key the create route requires.
const WEBHOOKS_API = `${API_BASE_PATH}/notify/webhooks`;

/** List the active org's webhooks (`GET …/webhooks`). */
export async function listWebhooks(): Promise<Webhook[]> {
  if (config.useMockApi) return mockResponse(webhookMockStore.list());
  const res = await apiClient.get<unknown>(WEBHOOKS_API);
  return z.array(webhookWireSchema).parse(res.data).map(toWebhook);
}

/** Create a webhook (`POST …/webhooks`). */
export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  if (config.useMockApi) return mockResponse(webhookMockStore.create(input));
  const res = await apiClient.post<unknown>(WEBHOOKS_API, input);
  return toWebhook(webhookWireSchema.parse(res.data));
}

/** Delete a webhook (`DELETE …/webhooks/:id`). */
export async function deleteWebhook(id: string): Promise<void> {
  if (config.useMockApi) {
    webhookMockStore.remove(id);
    return mockResponse(undefined);
  }
  await apiClient.delete<unknown>(`${WEBHOOKS_API}/${id}`);
}
