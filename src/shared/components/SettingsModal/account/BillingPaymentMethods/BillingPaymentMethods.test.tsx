import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

vi.mock('@/shared/billing/stripe-config.ts', () => ({
  isStripeEnabled: () => true,
}));

vi.mock('@/shared/hooks/useBillingPaymentMethods/index.ts', () => ({
  useBillingPaymentMethods: () => ({
    data: [
      {
        id: 'pm_1',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
      },
    ],
    isPending: false,
    isLoading: false,
    isError: false,
  }),
}));

import { BillingPaymentMethods } from './BillingPaymentMethods.tsx';

function renderMethods() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BillingPaymentMethods canManage />
    </QueryClientProvider>,
  );
}

describe('BillingPaymentMethods', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderMethods();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lists saved payment methods', () => {
    renderMethods();
    expect(screen.getByTestId('billing-payment-method-pm_1')).toBeInTheDocument();
    expect(screen.getByTestId('billing-add-payment-method')).toBeInTheDocument();
  });
});
