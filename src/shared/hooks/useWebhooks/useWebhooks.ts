import { useQuery } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import type { CreateWebhookInput, Webhook } from '@/shared/api/webhook-contracts.ts';
import * as api from '@/shared/api/webhooks-api.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';

const webhooksQueryKey = ['org', 'webhooks'] as const;

/** The active org's outbound webhooks. Server state only. */
export function useWebhooks() {
  return useQuery({ queryKey: webhooksQueryKey, queryFn: api.listWebhooks });
}

/** Create a webhook, then refresh the list. */
export function useCreateWebhook() {
  return useAppMutation({
    mutationFn: (input: CreateWebhookInput) => api.createWebhook(input),
    invalidateKeys: [webhooksQueryKey],
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.webhooks.createSuccess, {
      ns: ERRORS_NS,
    }),
  });
}

/** Delete a webhook, then refresh the list. */
export function useDeleteWebhook() {
  return useAppMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    invalidateKeys: [webhooksQueryKey],
    optimistic: {
      queryKey: webhooksQueryKey,
      update: (previous: Webhook[] | undefined, id) =>
        previous?.filter((webhook) => webhook.id !== id),
    },
    successMessage: i18n.t(ERRORS_KEYS.frontend.hooks.webhooks.deleteSuccess, {
      ns: ERRORS_NS,
    }),
  });
}
