import { useQuery } from '@tanstack/react-query';

import * as billingApi from '@/shared/api/billing-api.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

export function useBillingInvoices(enabled = true) {
  const orgId = useOrganizationStore((s) => s.organizationId);
  return useQuery({
    queryKey: billingQueryKeys.invoices(orgId),
    queryFn: billingApi.listBillingInvoices,
    enabled,
  });
}
