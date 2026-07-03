import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import {
  omitStripeReturnParams,
  readStripeBillingReturnParams,
} from '@/lib/billing/stripe-return.ts';
import { cn } from '@/lib/utils.ts';
import * as billingApi from '@/shared/api/billing-api.ts';
import type {
  BillingCycle,
  BillingPlan,
  BillingSubscription,
} from '@/shared/api/billing-contracts.ts';
import { billingQueryKeys } from '@/shared/api/billing-query-keys.ts';
import { isStripeEnabled } from '@/shared/billing/stripe-config.ts';
import { QueryBoundary } from '@/shared/components/QueryBoundary/index.ts';
import { BillingCancellationSection } from '@/shared/components/SettingsModal/account/BillingCancellationSection/index.ts';
import { BillingInvoicesTable } from '@/shared/components/SettingsModal/account/BillingInvoicesTable/index.ts';
import { BillingPaymentMethods } from '@/shared/components/SettingsModal/account/BillingPaymentMethods/index.ts';
import { SectionHeader } from '@/shared/components/SettingsModal/SettingsPanelShell.tsx';
import { StripePaymentForm } from '@/shared/components/StripePaymentForm/index.ts';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { useCan } from '@/shared/hooks/useCan/index.ts';
import { useLocaleFormat } from '@/shared/hooks/useLocaleFormat/index.ts';
import {
  useBillingPlans,
  useSelectBillingPlan,
  useSubscription,
} from '@/shared/hooks/useSubscription/index.ts';

function planPriceLabel(
  plan: BillingPlan,
  billingCycle: BillingCycle,
  formatCurrency: (cents: number, currency: string) => string,
) {
  if (billingCycle === 'yearly') {
    if (plan.priceYearly === 0) return '$0 / yr';
    return `${formatCurrency(plan.priceYearly, plan.currency)} / yr`;
  }
  if (plan.priceMonthly === 0) return '$0 / mo';
  return `${formatCurrency(plan.priceMonthly, plan.currency)} / mo`;
}

function statusBadgeVariant(status: BillingSubscription['status']) {
  if (status === 'active' || status === 'trialing') return 'secondary' as const;
  if (status === 'incomplete' || status === 'past_due' || status === 'unpaid') {
    return 'destructive' as const;
  }
  return 'outline' as const;
}

interface BillingContentProps {
  sub: BillingSubscription | null;
  plans: BillingPlan[];
}

function BillingContent({ sub, plans }: BillingContentProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useLocaleFormat();
  const canManage = useCan({
    permission: 'subscription:manage',
    teamOrganizationOnly: true,
  });
  const selectPlan = useSelectBillingPlan();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    sub?.billingCycle ?? 'monthly',
  );
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);

  const currentPlan = sub?.planId
    ? plans.find((plan) => plan.id === sub.planId)
    : undefined;

  const stripeEnabled = isStripeEnabled();
  const showBillingExtras = stripeEnabled && Boolean(sub);

  async function refreshBilling() {
    await queryClient.invalidateQueries({ queryKey: billingQueryKeys.all });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time Stripe redirect-return read on mount; navigate is a stable router handle and refreshBilling only wraps queryClient
  useEffect(() => {
    const { paymentIntentClientSecret, redirectStatus } = readStripeBillingReturnParams();
    if (redirectStatus === 'succeeded') {
      // Strip the Stripe return params through the router (not raw replaceState)
      // so its cached location stays in sync and a later navigation can't bring
      // them back.
      void navigate({
        to: '.',
        search: ((prev: Record<string, unknown>) =>
          omitStripeReturnParams(prev)) as never,
        replace: true,
      });
      void refreshBilling();
      return;
    }
    if (paymentIntentClientSecret) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from Stripe redirect params
      setPaymentClientSecret(paymentIntentClientSecret);
    }
    // navigate is a stable router handle; this is a one-time redirect-return read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !sub ||
      sub.status !== 'incomplete' ||
      !stripeEnabled ||
      !canManage ||
      paymentClientSecret
    ) {
      return;
    }
    billingApi
      .getSubscriptionPaymentSetup(sub.id)
      .then((setup) => {
        if (setup.clientSecret) {
          setPaymentClientSecret(setup.clientSecret);
        }
      })
      .catch(() => {
        /* best effort — payment setup is re-fetched on next mount */
      });
  }, [sub, stripeEnabled, canManage, paymentClientSecret]);

  async function handlePlanSelect(planId: string) {
    const updated = await selectPlan.mutateAsync({ planId, billingCycle });
    if (updated.status === 'incomplete' && stripeEnabled) {
      const setup = await billingApi.getSubscriptionPaymentSetup(updated.id);
      if (setup.clientSecret) {
        setPaymentClientSecret(setup.clientSecret);
      }
    }
  }

  const summaryDescription = sub
    ? `${sub.seatsUsed} of ${sub.seatsTotal ?? '∞'} seats used · renews ${formatDate(sub.currentPeriodEnd)}`
    : 'No active subscription yet. Choose a plan below.';

  return (
    <div className="space-y-6">
      <Card data-testid="billing-summary">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">
              {currentPlan?.name ?? 'No plan'} {currentPlan ? 'plan' : ''}
            </CardTitle>
            {sub ? (
              <Badge variant={statusBadgeVariant(sub.status)}>
                {sub.status.replace('_', ' ')}
              </Badge>
            ) : null}
          </div>
          <CardDescription>{summaryDescription}</CardDescription>
          {sub ? (
            <p className="text-muted-foreground text-sm">
              Billed {sub.billingCycle === 'yearly' ? 'yearly' : 'monthly'}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      {paymentClientSecret ? (
        <Card data-testid="billing-payment-card">
          <CardHeader>
            <CardTitle className="text-base">Complete payment</CardTitle>
            <CardDescription>
              Confirm your payment method to activate the subscription. You stay in the
              app — Stripe only opens a secure step if your bank requires verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripePaymentForm
              clientSecret={paymentClientSecret}
              intent="payment"
              onCancel={() => setPaymentClientSecret(null)}
              onComplete={() => {
                setPaymentClientSecret(null);
                // Strip the Stripe return params through the router (mirrors the
                // redirect-return effect above) so its cached location stays in sync.
                void navigate({
                  to: '.',
                  search: ((prev: Record<string, unknown>) =>
                    omitStripeReturnParams(prev)) as never,
                  replace: true,
                });
                void refreshBilling();
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <BillingPaymentMethods enabled={showBillingExtras} canManage={canManage} />

      <BillingInvoicesTable enabled={showBillingExtras} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Change plan</h3>
            <p className="text-muted-foreground text-sm">
              Compare plans and switch when your team is ready.
            </p>
          </div>
          {canManage ? (
            <fieldset
              className="inline-flex rounded-md border p-0.5"
              data-testid="billing-cycle-toggle"
            >
              <legend className="sr-only">Billing cycle</legend>
              {(['monthly', 'yearly'] as const).map((cycle) => (
                <Button
                  key={cycle}
                  type="button"
                  size="sm"
                  variant={billingCycle === cycle ? 'secondary' : 'ghost'}
                  className="h-8"
                  onClick={() => setBillingCycle(cycle)}
                  data-testid={`billing-cycle-${cycle}`}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                </Button>
              ))}
            </fieldset>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3" data-testid="plan-options">
          {plans.map((plan) => {
            const current = sub?.planId === plan.id;
            let action: ReactNode = null;
            if (current) {
              action = <Badge variant="secondary">Current plan</Badge>;
            } else if (canManage) {
              action = (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={selectPlan.isPending}
                  onClick={() => void handlePlanSelect(plan.id)}
                  data-testid={`plan-${plan.id}`}
                >
                  {sub ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                </Button>
              );
            }
            return (
              <Card
                key={plan.id}
                className={cn(current && 'border-primary ring-primary/20 ring-2')}
              >
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription>
                    {planPriceLabel(plan, billingCycle, formatCurrency)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    {plan.description ?? 'Workspace billing plan.'}
                  </p>
                  {action}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {sub ? (
        <BillingCancellationSection subscription={sub} canManage={canManage} />
      ) : null}
    </div>
  );
}

/**
 * Account billing — current plan, payment methods, invoices, plan changes, cancellation.
 * Plan changes are gated on subscription:manage for team organizations.
 */
export function AccountBillingPanel() {
  const subscriptionQuery = useSubscription();
  const plansQuery = useBillingPlans();

  return (
    <section className="space-y-6" data-testid="settings-account-billing">
      <SectionHeader
        title="Billing"
        description="Your plan, payment methods, and invoices."
      />
      <QueryBoundary
        query={subscriptionQuery}
        errorMessage="Couldn't load billing. Please try again."
      >
        {(sub) => (
          <QueryBoundary
            query={plansQuery}
            errorMessage="Couldn't load plans. Please try again."
          >
            {(plans) => (
              <BillingContent sub={sub} plans={plans.filter((plan) => plan.isActive)} />
            )}
          </QueryBoundary>
        )}
      </QueryBoundary>
    </section>
  );
}
