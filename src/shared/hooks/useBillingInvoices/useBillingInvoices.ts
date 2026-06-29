import { useQuery } from '@tanstack/react-query';

import * as billingApi from '@/shared/api/billing-api.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';

export function useBillingInvoices(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.invoices(),
    queryFn: billingApi.listBillingInvoices,
    enabled,
  });
}
