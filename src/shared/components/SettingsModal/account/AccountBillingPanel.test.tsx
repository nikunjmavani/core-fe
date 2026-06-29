import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const {
  useSubscriptionMock,
  useBillingPlansMock,
  selectPlanMutateAsync,
  useSelectBillingPlanMock,
  navigateMock,
} = vi.hoisted(() => ({
  useSubscriptionMock: vi.fn(),
  useBillingPlansMock: vi.fn(),
  selectPlanMutateAsync: vi.fn(),
  useSelectBillingPlanMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/shared/billing/stripe-config.ts', () => ({
  isStripeEnabled: () => false,
}));

vi.mock(
  '@/shared/components/SettingsModal/account/BillingPaymentMethods/index.ts',
  () => ({
    BillingPaymentMethods: () => null,
  }),
);

vi.mock(
  '@/shared/components/SettingsModal/account/BillingInvoicesTable/index.ts',
  () => ({
    BillingInvoicesTable: () => null,
  }),
);

vi.mock(
  '@/shared/components/SettingsModal/account/BillingCancellationSection/index.ts',
  () => ({
    BillingCancellationSection: () => <div data-testid="billing-cancellation-card" />,
  }),
);

vi.mock('@/shared/hooks/useSubscription/index.ts', () => ({
  useSubscription: useSubscriptionMock,
  useBillingPlans: useBillingPlansMock,
  useSelectBillingPlan: useSelectBillingPlanMock,
  useCancelSubscription: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeSubscription: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/shared/api/billing-api.ts', () => ({
  getSubscriptionPaymentSetup: vi.fn(),
}));

import { AccountBillingPanel } from './AccountBillingPanel.tsx';

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AccountBillingPanel />
    </QueryClientProvider>,
  );
}

const PLANS = [
  {
    id: 'pln_free',
    name: 'Free',
    description: 'For getting started.',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    isActive: true,
    seatLimit: null,
  },
  {
    id: 'pln_pro',
    name: 'Pro',
    description: 'For growing teams.',
    priceMonthly: 9900,
    priceYearly: 99000,
    currency: 'usd',
    isActive: true,
    seatLimit: null,
  },
];

const SUB = {
  id: 'sub_test',
  planId: 'pln_free',
  status: 'active' as const,
  billingCycle: 'monthly' as const,
  currentPeriodStart: '2026-01-01T00:00:00.000Z',
  currentPeriodEnd: '2026-12-01T00:00:00.000Z',
  trialEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  provider: 'stripe',
  seatsTotal: 3,
  seatsUsed: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function setCanManage(value: boolean) {
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
  useOrganizationStore.setState({
    organizationType: value ? 'TEAM' : 'PERSONAL',
    permissions: value ? ['subscription:manage'] : [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useOrganizationStore.getState().clearOrganization();
  useBillingPlansMock.mockReturnValue({
    data: PLANS,
    isPending: false,
    isLoading: false,
    isError: false,
  });
  useSelectBillingPlanMock.mockReturnValue({
    mutateAsync: selectPlanMutateAsync,
    isPending: false,
  });
});

describe('AccountBillingPanel', () => {
  it('shows a loading state', () => {
    useSubscriptionMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isLoading: true,
      isError: false,
    });
    renderPanel();
    expect(screen.getByTestId('query-skeleton')).toBeInTheDocument();
  });

  it('renders the current plan summary and plan options', () => {
    useSubscriptionMock.mockReturnValue({
      data: SUB,
      isPending: false,
      isLoading: false,
      isError: false,
    });
    setCanManage(true);
    renderPanel();
    expect(screen.getByTestId('billing-summary')).toBeInTheDocument();
    expect(screen.getByTestId('plan-options')).toBeInTheDocument();
    expect(screen.getByTestId('plan-pln_pro')).toBeInTheDocument();
  });

  it('switches plan when allowed', async () => {
    useSubscriptionMock.mockReturnValue({
      data: SUB,
      isPending: false,
      isLoading: false,
      isError: false,
    });
    setCanManage(true);
    selectPlanMutateAsync.mockResolvedValue({
      ...SUB,
      planId: 'pln_pro',
      status: 'active',
    });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('plan-pln_pro'));
    expect(selectPlanMutateAsync).toHaveBeenCalledWith({
      planId: 'pln_pro',
      billingCycle: 'monthly',
    });
  });

  it('hides plan-switch controls without the billing permission', () => {
    useSubscriptionMock.mockReturnValue({
      data: SUB,
      isPending: false,
      isLoading: false,
      isError: false,
    });
    setCanManage(false);
    renderPanel();
    expect(screen.getByTestId('billing-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-pln_pro')).not.toBeInTheDocument();
  });

  it('strips Stripe return params through the router after a succeeded redirect', () => {
    window.history.replaceState(
      {},
      '',
      '/organization/acme/dashboard?payment_intent_client_secret=pi_secret&redirect_status=succeeded#settings/account/billing',
    );
    useSubscriptionMock.mockReturnValue({
      data: SUB,
      isPending: false,
      isLoading: false,
      isError: false,
    });
    setCanManage(true);
    renderPanel();

    // Cleared via the router (not raw history.replaceState) so its location
    // stays in sync and a later navigation cannot reintroduce the params.
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '.', replace: true }),
    );
    const updater = navigateMock.mock.calls.at(-1)?.[0]?.search as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(
      updater({ payment_intent_client_secret: 'pi_secret', tab: 'billing' }),
    ).toEqual({ tab: 'billing' });

    window.history.replaceState({}, '', '/');
  });
});
