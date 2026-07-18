import { useCallback, useState } from 'react';

import { isStepUpRequiredError } from '@/shared/api/step-up-api.ts';

import { StepUpDialog } from './StepUpDialog.tsx';

interface GuardOptions {
  /** Offer the bootstrap email-code factor (false for destructive mutations). */
  allowEmailCode?: boolean;
  /** Non-step-up errors land here (step-up 403s never do — they open the dialog). */
  onError?: (error: unknown) => void;
}

interface PendingStepUp {
  action: () => Promise<unknown>;
  options?: GuardOptions;
}

/**
 * Guard for step-up-gated mutations. Wrap the call: on core-be's
 * "recent step-up required" 403 it opens {@link StepUpDialog} and re-runs the
 * action after verification; any other error goes to `options.onError`.
 *
 * ```tsx
 * const { guard, stepUpDialog } = useStepUpGuard();
 * guard(() => begin.mutateAsync().then(onBegun), { onError: notifySetupFailed });
 * // …render {stepUpDialog} once at the component root.
 * ```
 */
export function useStepUpGuard() {
  const [pending, setPending] = useState<PendingStepUp | null>(null);

  const guard = useCallback(
    (action: () => Promise<unknown>, options?: GuardOptions): void => {
      action().catch((error: unknown) => {
        if (isStepUpRequiredError(error)) {
          setPending({ action, options });
          return;
        }
        options?.onError?.(error);
      });
    },
    [],
  );

  const stepUpDialog = pending ? (
    <StepUpDialog
      open
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      allowEmailCode={pending.options?.allowEmailCode ?? true}
      onVerified={() => {
        const { action, options } = pending;
        setPending(null);
        guard(action, options);
      }}
    />
  ) : null;

  return { guard, stepUpDialog };
}
