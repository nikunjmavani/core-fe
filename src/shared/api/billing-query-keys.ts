/**
 * TanStack Query keys for billing (plans + subscriptions). Lives beside
 * `billing-api.ts` so hooks share one namespace.
 */
export const billingQueryKeys = {
  all: ['billing'] as const,
  plans: () => [...billingQueryKeys.all, 'plans'] as const,
  subscriptions: () => [...billingQueryKeys.all, 'subscriptions'] as const,
  activeSubscription: () => [...billingQueryKeys.all, 'active-subscription'] as const,
  invoices: () => [...billingQueryKeys.all, 'invoices'] as const,
  paymentMethods: () => [...billingQueryKeys.all, 'payment-methods'] as const,
};
