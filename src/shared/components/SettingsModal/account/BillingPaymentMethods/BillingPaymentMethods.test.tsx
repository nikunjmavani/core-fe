import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

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

afterEach(() => {
  navigateMock.mockClear();
  window.history.replaceState({}, '', '/');
});

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

  it('strips Stripe setup-intent return params through the router', () => {
    window.history.replaceState(
      {},
      '',
      '/organization/acme/dashboard?setup_intent_client_secret=si_secret&redirect_status=succeeded#settings/account/billing',
    );
    renderMethods();

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '.', replace: true }),
    );
    const updater = navigateMock.mock.calls.at(-1)?.[0]?.search as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(
      updater({ setup_intent_client_secret: 'si_secret', redirect_status: 'succeeded' }),
    ).toEqual({});
  });

  it('renders nothing when disabled (no subscription — was a stuck skeleton)', () => {
    // Regression: the card rendered whenever Stripe was on, but the query was
    // disabled without a subscription, stranding a permanent loading skeleton.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const { queryByTestId } = render(
      <QueryClientProvider client={client}>
        <BillingPaymentMethods enabled={false} canManage />
      </QueryClientProvider>,
    );
    expect(queryByTestId('billing-payment-methods-card')).not.toBeInTheDocument();
  });
});
