import type { ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';
import type { Plan } from '@/shared/api/organization-contracts.ts';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import {
  useSubscription,
  useUpdateSubscriptionPlan,
} from '@/shared/hooks/useSubscription/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

const PLANS: ReadonlyArray<{ id: Plan; label: string; price: string; blurb: string }> = [
  { id: 'free', label: 'Free', price: '$0', blurb: 'For getting started.' },
  { id: 'pro', label: 'Pro', price: '$99 / mo', blurb: 'For growing teams.' },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: '$499 / mo',
    blurb: 'Advanced controls + priority support.',
  },
];

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(cents / 100);
}

/**
 * Billing panel — the active org's plan + usage, with plan switching gated on
 * `canManageBilling`. Covers loading / error states. (Invoices + payment method
 * are follow-ups behind a confirmed billing contract.)
 */
export function OrganizationBillingPanel() {
  const { data: sub, isLoading, isError } = useSubscription();
  const canManage = useOrganizationStore(
    (s) => s.capabilities?.canManageBilling ?? false,
  );
  const changePlan = useUpdateSubscriptionPlan();

  return (
    <section className="space-y-6" data-testid="settings-organization-billing">
      <SectionHeader title="Billing" description="Your plan and usage." />

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-lg" data-testid="billing-loading" />
      ) : null}

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          Couldn&apos;t load billing. Please try again.
        </p>
      ) : null}

      {sub ? (
        <>
          <Card data-testid="billing-summary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base capitalize">{sub.plan} plan</CardTitle>
                <Badge variant={sub.status === 'active' ? 'secondary' : 'destructive'}>
                  {sub.status}
                </Badge>
              </div>
              <CardDescription>
                {sub.seatsUsed} of {sub.seats} seats used ·{' '}
                {formatMoney(sub.amountCents, sub.currency)}
                {sub.amountCents > 0 ? ' / mo' : ''}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3" data-testid="plan-options">
            {PLANS.map((p) => {
              const current = sub.plan === p.id;
              let action: ReactNode = null;
              if (current) {
                action = <Badge variant="secondary">Current plan</Badge>;
              } else if (canManage) {
                action = (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={changePlan.isPending}
                    onClick={() => changePlan.mutate(p.id)}
                    data-testid={`plan-${p.id}`}
                  >
                    Switch to {p.label}
                  </Button>
                );
              }
              return (
                <Card
                  key={p.id}
                  className={cn(current && 'border-primary ring-primary/20 ring-2')}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{p.label}</CardTitle>
                    <CardDescription>{p.price}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground text-sm">{p.blurb}</p>
                    {action}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
