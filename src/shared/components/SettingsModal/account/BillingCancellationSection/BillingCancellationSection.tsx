import type { BillingSubscription } from '@/shared/api/billing-contracts.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { useLocaleFormat } from '@/shared/hooks/useLocaleFormat/index.ts';
import {
  useCancelSubscription,
  useResumeSubscription,
} from '@/shared/hooks/useSubscription/index.ts';

interface BillingCancellationSectionProps {
  subscription: BillingSubscription;
  canManage: boolean;
}

/** Cancel or resume subscription — shown last on the billing panel. */
export function BillingCancellationSection({
  subscription,
  canManage,
}: BillingCancellationSectionProps) {
  const { formatDate } = useLocaleFormat();
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();

  if (!canManage) return null;

  const periodEnd = formatDate(subscription.currentPeriodEnd);

  return (
    <Card data-testid="billing-cancellation-card">
      <CardHeader>
        <CardTitle className="text-base">Cancellation</CardTitle>
        <CardDescription>
          {subscription.cancelAtPeriodEnd
            ? `Your subscription ends on ${periodEnd}. You keep access until then.`
            : `Cancel anytime — access continues through ${periodEnd}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscription.cancelAtPeriodEnd ? (
          <Button
            size="sm"
            variant="outline"
            disabled={resumeSubscription.isPending}
            onClick={() => resumeSubscription.mutate(subscription.id)}
            data-testid="billing-resume"
          >
            Resume subscription
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  cancelSubscription.isPending || subscription.status === 'incomplete'
                }
                data-testid="billing-cancel"
              >
                Cancel at period end
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="billing-cancel-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your workspace keeps full access until {periodEnd}. After that, the
                  subscription ends and paid features may be limited.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelSubscription.mutate(subscription.id)}
                >
                  Confirm cancellation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
