import { useQuery } from '@tanstack/react-query';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import * as billingApi from '@/shared/api/billing-api.ts';
import type { BillingCycle } from '@/shared/api/billing-contracts.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';
import { useAppMutation } from '@/shared/hooks/useAppMutation/index.ts';

/**
 * Active subscription for the current organization — query + plan mutations.
 * Server state only — never mirrored into Zustand (file-structure.mdc).
 */
export function useSubscription() {
  return useQuery({
    queryKey: billingQueryKeys.activeSubscription(),
    queryFn: billingApi.getActiveSubscription,
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: billingQueryKeys.plans(),
    queryFn: billingApi.listBillingPlans,
  });
}

export function useSelectBillingPlan() {
  return useAppMutation({
    mutationFn: async ({
      planId,
      billingCycle,
    }: {
      planId: string;
      billingCycle: BillingCycle;
    }) => {
      const existing = await billingApi.getActiveSubscription();
      if (existing) {
        return billingApi.changeSubscriptionPlan({
          subscriptionId: existing.id,
          planId,
        });
      }
      return billingApi.createSubscription({ planId, billingCycle });
    },
    invalidateKeys: [
      billingQueryKeys.activeSubscription(),
      billingQueryKeys.subscriptions(),
    ],
    successMessage: (subscription) =>
      i18n.t(ERRORS_KEYS.frontend.hooks.subscription.changePlanSuccess, {
        ns: ERRORS_NS,
        plan: subscription.planId ?? 'plan',
      }),
  });
}

export function useCancelSubscription() {
  return useAppMutation({
    mutationFn: (subscriptionId: string) => billingApi.cancelSubscription(subscriptionId),
    invalidateKeys: [billingQueryKeys.activeSubscription()],
  });
}

export function useResumeSubscription() {
  return useAppMutation({
    mutationFn: (subscriptionId: string) => billingApi.resumeSubscription(subscriptionId),
    invalidateKeys: [billingQueryKeys.activeSubscription()],
  });
}
