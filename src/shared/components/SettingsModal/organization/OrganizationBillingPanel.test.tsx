import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { useSubscriptionMock, planMutate } = vi.hoisted(() => ({
  useSubscriptionMock: vi.fn(),
  planMutate: vi.fn(),
}));
vi.mock('@/shared/hooks/useSubscription/index.ts', () => ({
  useSubscription: useSubscriptionMock,
  useUpdateSubscriptionPlan: () => ({ mutate: planMutate, isPending: false }),
}));

import { OrganizationBillingPanel } from './OrganizationBillingPanel.tsx';

const SUB = {
  plan: 'free',
  status: 'active',
  seats: 3,
  seatsUsed: 1,
  renewsAt: '2026-12-01T00:00:00.000Z',
  amountCents: 0,
  currency: 'usd',
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
});

describe('OrganizationBillingPanel', () => {
  it('shows a loading state', () => {
    useSubscriptionMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<OrganizationBillingPanel />);
    expect(screen.getByTestId('billing-loading')).toBeInTheDocument();
  });

  it('renders the current plan summary and plan options', () => {
    useSubscriptionMock.mockReturnValue({ data: SUB, isLoading: false, isError: false });
    setCanManage(true);
    render(<OrganizationBillingPanel />);
    expect(screen.getByTestId('billing-summary')).toBeInTheDocument();
    expect(screen.getByTestId('plan-options')).toBeInTheDocument();
    // current plan (free) shows no switch button; upgrades do
    expect(screen.queryByTestId('plan-free')).not.toBeInTheDocument();
    expect(screen.getByTestId('plan-pro')).toBeInTheDocument();
  });

  it('switches plan when allowed', async () => {
    useSubscriptionMock.mockReturnValue({ data: SUB, isLoading: false, isError: false });
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationBillingPanel />);
    await user.click(screen.getByTestId('plan-pro'));
    expect(planMutate).toHaveBeenCalledWith('pro');
  });

  it('hides plan-switch controls without the billing capability', () => {
    useSubscriptionMock.mockReturnValue({ data: SUB, isLoading: false, isError: false });
    setCanManage(false);
    render(<OrganizationBillingPanel />);
    expect(screen.getByTestId('billing-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-pro')).not.toBeInTheDocument();
  });
});
