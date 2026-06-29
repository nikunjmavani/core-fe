import { useQuery } from '@tanstack/react-query';

import * as billingApi from '@/shared/api/billing-api.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

export function useBillingPaymentMethods(enabled = true) {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useQuery({
    queryKey: billingQueryKeys.paymentMethods(orgId),
    queryFn: billingApi.listBillingPaymentMethods,
    enabled,
  });
}
