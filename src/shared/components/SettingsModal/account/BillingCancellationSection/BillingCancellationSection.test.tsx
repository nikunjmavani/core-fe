import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { BillingSubscription } from '@/shared/api/billing-contracts.ts';

vi.mock('@/shared/hooks/useSubscription/index.ts', () => ({
  useCancelSubscription: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeSubscription: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { BillingCancellationSection } from './BillingCancellationSection.tsx';

const SUB: BillingSubscription = {
  id: 'sub_test',
  planId: 'pln_pro',
  status: 'active',
  billingCycle: 'monthly',
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

function renderSection(canManage = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BillingCancellationSection subscription={SUB} canManage={canManage} />
    </QueryClientProvider>,
  );
}

describe('BillingCancellationSection', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderSection();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows cancel control when the user can manage billing', () => {
    renderSection(true);
    expect(screen.getByTestId('billing-cancel')).toBeInTheDocument();
  });

  it('hides the section when the user cannot manage billing', () => {
    renderSection(false);
    expect(screen.queryByTestId('billing-cancellation-card')).not.toBeInTheDocument();
  });
});
