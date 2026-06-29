import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';

import {
  type CreateWebhookInput,
  toWebhook,
  type Webhook,
  webhookWireSchema,
} from './webhook-contracts.ts';

const WEBHOOKS_API = `${API_BASE_PATH}/notify/webhooks`;

export async function listWebhooks(): Promise<Webhook[]> {
  const res = await apiClient.get<unknown>(WEBHOOKS_API);
  return z.array(webhookWireSchema).parse(res.data).map(toWebhook);
}

export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  const res = await apiClient.post<unknown>(WEBHOOKS_API, input);
  return toWebhook(webhookWireSchema.parse(res.data));
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete<unknown>(`${WEBHOOKS_API}/${id}`);
}
