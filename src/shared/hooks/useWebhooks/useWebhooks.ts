import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateWebhookInput } from '@/shared/api/webhook-contracts.ts';
import * as api from '@/shared/api/webhooks-api.ts';
import { notify } from '@/shared/notify/index.ts';

const webhooksQueryKey = ['org', 'webhooks'] as const;

/** The active org's outbound webhooks. Server state only. */
export function useWebhooks() {
  return useQuery({ queryKey: webhooksQueryKey, queryFn: api.listWebhooks });
}

/** Create a webhook, then refresh the list. */
export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWebhookInput) => api.createWebhook(input),
    onSuccess: () => {
      notify.success('Webhook created');
      return queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
    },
    onError: () => notify.error('Could not create webhook'),
  });
}

/** Delete a webhook, then refresh the list. */
export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => {
      notify.success('Webhook deleted');
      return queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
    },
    onError: () => notify.error('Could not delete webhook'),
  });
}
