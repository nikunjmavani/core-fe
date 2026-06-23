import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as orgApi from '@/shared/api/organization-api.ts';
import type { Plan } from '@/shared/api/organization-contracts.ts';
import { orgQueryKeys } from '@/shared/api/organization-query-keys.ts';
import { notify } from '@/shared/notify/index.ts';

/**
 * Subscription of the active organization — query + plan-change mutation.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
/** Subscription for the active organization. */
export function useSubscription() {
  return useQuery({
    queryKey: orgQueryKeys.subscription(),
    queryFn: orgApi.getSubscription,
  });
}

/** Change the subscription plan, then refresh the subscription. */
export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) => orgApi.updateSubscriptionPlan(plan),
    onSuccess: (subscription) => {
      notify.success(`Switched to the ${subscription.plan} plan`);
      return queryClient.invalidateQueries({ queryKey: orgQueryKeys.subscription() });
    },
    onError: () => notify.error('Could not change plan'),
  });
}
