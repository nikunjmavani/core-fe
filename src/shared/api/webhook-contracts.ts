import { z } from 'zod';

import { isoDateString, publicId } from '@/core/types/wire.ts';

/**
 * Outbound webhook contracts (core-be `/tenancy/organization/webhooks`) for the
 * Integrations panel. Mock-first; mirrors the established wire→domain mapper
 * pattern. REPLACE_WITH_API.
 */
export const WEBHOOK_EVENTS = [
  'member.created',
  'member.removed',
  'role.changed',
  'billing.updated',
] as const;

export const webhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string(),
});
export type Webhook = z.infer<typeof webhookSchema>;

export const webhookWireSchema = z.object({
  id: publicId('whk'),
  url: z.string(),
  events: z.array(z.string()),
  active: z.boolean(),
  created_at: isoDateString,
});
export type WebhookWire = z.infer<typeof webhookWireSchema>;

export function toWebhook(wire: WebhookWire): Webhook {
  return {
    id: wire.id,
    url: wire.url,
    events: wire.events,
    active: wire.active,
    createdAt: wire.created_at,
  };
}

/** New-webhook input (the URL + which events to deliver). */
export const createWebhookSchema = z.object({
  url: z.string().url('Enter a valid https URL'),
  events: z.array(z.string()).min(1, 'Choose at least one event'),
});
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
