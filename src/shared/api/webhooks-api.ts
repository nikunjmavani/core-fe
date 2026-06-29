import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';

import { fetchAllPages } from './fetch-all-pages.ts';
import {
  type CreateWebhookInput,
  toWebhook,
  type Webhook,
  webhookWireSchema,
} from './webhook-contracts.ts';

const WEBHOOKS_API = `${API_BASE_PATH}/notify/webhooks`;

export async function listWebhooks(): Promise<Webhook[]> {
  return (await fetchAllPages(WEBHOOKS_API, webhookWireSchema, 'webhooks')).map(
    toWebhook,
  );
}

export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  const res = await apiClient.post<unknown>(WEBHOOKS_API, input);
  return toWebhook(webhookWireSchema.parse(res.data));
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete<unknown>(`${WEBHOOKS_API}/${id}`);
}
